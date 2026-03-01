import type { Key } from '@heroui/react'
import { Button, Card, Label, ListBox, Select, Switch } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { RefreshCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiBaseUrlAtom } from '@/atoms/api'
import { RequireConnection } from '@/components/RequireConnection'

type LogEvent = {
  id: number
  ctime: string | Date
  type?: string | null
  msg: string
}

export default function LogsPage() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const [events, setEvents] = useState<LogEvent[]>([])
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<Key>('all')
  const wsRef = useRef<WebSocket | null>(null)
  const pendingAutoRefreshRef = useRef(false)

  const sortedEvents = useMemo(() => {
    if (levelFilter === 'all') return events
    return events.filter((event) => event.type === String(levelFilter))
  }, [events, levelFilter])

  const mergeEvents = useCallback((incoming: LogEvent[]) => {
    setEvents((prev) => {
      const map = new Map<number, LogEvent>()
      for (const item of prev) map.set(item.id, item)
      for (const item of incoming) {
        if (typeof item?.id !== 'number') continue
        map.set(item.id, item)
      }
      return Array.from(map.values()).sort((a, b) => b.id - a.id)
    })
  }, [])

  const sendCmd = useCallback((cmd: Record<string, unknown>) => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(cmd))
  }, [])

  const handleRefresh = useCallback(() => {
    sendCmd({ cmd: 'list' })
  }, [sendCmd])

  const handleClear = useCallback(async () => {
    setIsClearing(true)
    setError(null)
    try {
      const response = await fetch(`${apiBaseUrl}/api/events`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`清空失败: ${response.status} ${response.statusText}`)
      }
      setEvents([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空失败')
    } finally {
      setIsClearing(false)
    }
  }, [apiBaseUrl])

  const handleToggleAutoRefresh = useCallback(
    (next: boolean) => {
      const socket = wsRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError('日志连接未就绪')
        return
      }
      setIsAutoRefresh(next)
      sendCmd({ cmd: 'toggle-auto-refresh' })
    },
    [sendCmd],
  )

  useEffect(() => {
    setIsConnecting(true)
    setError(null)

    let ws: WebSocket | null = null
    let isMounted = true

    try {
      const base = new URL(apiBaseUrl)
      const wsUrl = new URL('/api/events/_ws', base)
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

      ws = new WebSocket(wsUrl.toString())
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMounted || wsRef.current !== ws) return
        setIsConnecting(false)
        pendingAutoRefreshRef.current = true
        sendCmd({ cmd: 'list' })
      }

      ws.onmessage = (event) => {
        if (!isMounted || wsRef.current !== ws) return

        let data: unknown = event.data
        try {
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data)
          }
        } catch {
          return
        }

        // 检查服务端返回的错误
        if (data && typeof data === 'object') {
          const response = data as {
            success?: boolean
            error?: string
            events?: LogEvent[]
          }

          // 如果 success 为 false 或存在 error 字段，显示错误
          if (response.success === false || response.error) {
            setError(response.error || '服务器返回错误')
            return
          }
        }

        let incoming: LogEvent[] | null = null

        if (Array.isArray(data)) {
          incoming = data as LogEvent[]
        } else if (data && typeof data === 'object') {
          const payload = data as { events?: LogEvent[] }
          if (payload.events && Array.isArray(payload.events)) {
            incoming = payload.events
          }
        }

        if (!incoming) return

        mergeEvents(incoming)

        if (pendingAutoRefreshRef.current) {
          pendingAutoRefreshRef.current = false
          setIsAutoRefresh(true)
          sendCmd({ cmd: 'toggle-auto-refresh' })
        }
      }

      ws.onerror = () => {
        if (!isMounted || wsRef.current !== ws) return
        setError('日志连接失败')
        setIsConnecting(false)
      }

      ws.onclose = () => {
        if (!isMounted || wsRef.current !== ws) return
        setIsConnecting(false)
        setIsAutoRefresh(false)
      }
    } catch (err) {
      if (!isMounted) return
      setError(err instanceof Error ? err.message : '日志连接失败')
      setIsConnecting(false)
    }

    return () => {
      isMounted = false
      if (ws) {
        ws.close()
      }
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      pendingAutoRefreshRef.current = false
    }
  }, [apiBaseUrl, mergeEvents, sendCmd])

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold">日志</h1>
          <div className="flex flex-row flex-wrap items-center gap-3">
            <Select
              value={levelFilter}
              onChange={(value) => setLevelFilter(value || 'all')}
              className="w-32"
              placeholder="选择等级"
            >
              <Label className="sr-only">日志等级</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="全部">
                    全部
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="INFO" textValue="INFO">
                    INFO
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="WARN" textValue="WARN">
                    WARN
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="ERROR" textValue="ERROR">
                    ERROR
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <Button
              onPress={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              isDisabled={isConnecting}
            >
              <RefreshCcw className="size-4" />
              刷新
            </Button>
            <Button
              onPress={handleClear}
              variant="danger"
              className="flex items-center gap-2"
              isDisabled={isConnecting || isClearing}
            >
              <Trash2 className="size-4" />
              {isClearing ? '清空中...' : '清空日志'}
            </Button>
            <Switch
              isSelected={isAutoRefresh}
              onChange={handleToggleAutoRefresh}
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <Label className="text-sm">自动刷新</Label>
              </Switch.Content>
            </Switch>
          </div>
        </div>
        <Card className="p-6">
          <Card.Content className="max-h-[47.5vh] md:max-h-[55vh] overflow-y-auto">
            {error ? (
              <p className="text-danger">{error}</p>
            ) : sortedEvents.length === 0 ? (
              <p className="text-muted">
                {isConnecting ? '正在连接日志服务...' : '暂无日志'}
              </p>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => {
                  const isError = event.type === 'ERROR'
                  return (
                    <Card
                      key={event.id}
                      className={`${
                        isError
                          ? 'border-danger bg-danger/10'
                          : 'border-border/70 bg-content1'
                      }`}
                    >
                      <Card.Content className="px-4 py-3">
                        <div
                          className={`mb-1 flex flex-wrap items-center gap-2 text-xs ${
                            isError ? 'text-danger' : 'text-muted'
                          }`}
                        >
                          <span className="rounded bg-content2 px-2 py-0.5 font-mono">
                            #{event.id}
                          </span>
                          <span>{new Date(event.ctime).toLocaleString()}</span>
                          {event.type ? (
                            <span
                              className={`rounded px-2 py-0.5 ${
                                isError
                                  ? 'bg-danger-soft-hover text-danger'
                                  : 'bg-content2 text-muted'
                              }`}
                            >
                              {event.type}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`whitespace-pre-wrap text-sm ${
                            isError ? 'text-danger' : 'text-foreground'
                          }`}
                        >
                          {event.msg}
                        </p>
                      </Card.Content>
                    </Card>
                  )
                })}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </RequireConnection>
  )
}
