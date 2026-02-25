import { Button, Card, Label, Switch } from '@heroui/react'
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

export function LogsPage() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const [events, setEvents] = useState<LogEvent[]>([])
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingAutoRefreshRef = useRef(false)

  const sortedEvents = useMemo(() => events, [events])

  const mergeEvents = useCallback((incoming: LogEvent[]) => {
    setEvents((prev) => {
      const map = new Map<number, LogEvent>()
      for (const item of prev) map.set(item.id, item)
      for (const item of incoming) {
        if (typeof item?.id !== 'number') continue
        map.set(item.id, item)
      }
      return Array.from(map.values()).sort((a, b) => {
        const aTime = new Date(a.ctime).getTime()
        const bTime = new Date(b.ctime).getTime()
        return aTime - bTime
      })
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

    try {
      const base = new URL(apiBaseUrl)
      const wsUrl = new URL('/api/events', base)
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

      ws = new WebSocket(wsUrl.toString())
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnecting(false)
        pendingAutoRefreshRef.current = true
        sendCmd({ cmd: 'list' })
      }

      ws.onmessage = (event) => {
        let data: unknown = event.data
        try {
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data)
          }
        } catch {
          return
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
        setError('日志连接失败')
        setIsConnecting(false)
      }

      ws.onclose = () => {
        setIsConnecting(false)
        setIsAutoRefresh(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '日志连接失败')
      setIsConnecting(false)
    }

    return () => {
      ws?.close()
      wsRef.current = null
      pendingAutoRefreshRef.current = false
    }
  }, [apiBaseUrl, mergeEvents, sendCmd])

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold">日志</h1>
          <div className="flex items-center gap-3">
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
          <Card.Content>
            {error ? (
              <p className="text-danger">{error}</p>
            ) : sortedEvents.length === 0 ? (
              <p className="text-muted">
                {isConnecting ? '正在连接日志服务...' : '暂无日志'}
              </p>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border/70 bg-content1 px-4 py-3"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded bg-content2 px-2 py-0.5 font-mono">
                        #{event.id}
                      </span>
                      <span>{new Date(event.ctime).toLocaleString()}</span>
                      {event.type ? (
                        <span className="rounded bg-content2 px-2 py-0.5">
                          {event.type}
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{event.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </RequireConnection>
  )
}
