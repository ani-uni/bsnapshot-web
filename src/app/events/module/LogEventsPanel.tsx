import type { Key } from '@heroui/react'
import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Pagination,
  Select,
  Spinner,
  Switch,
  Table,
  TableLayout,
  toast,
  Virtualizer,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { RefreshCcw, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiBaseUrlAtom } from '@/atoms/api'
import { type LogEvent, logEventsAtom } from '@/atoms/events'
import {
  getLogStyles,
  LOG_LEVEL_OPTIONS,
  LOG_STRING_FILTER_FIELD,
  type LogLevelFilter,
  normalizeLevelFilter,
} from './options'
import {
  acquireEventWs,
  sendEventWsCmd,
  setEventWsAutoRefresh,
} from './ws-manager'

const FILTER_CHUNK_SIZE = 500
const FILTER_DEBOUNCE_MS = 120
const PAGE_SIZE = 100

type LogEventsPanelProps = {
  lockedContains?: string
  showLockedFilterHint?: boolean
  showClearButton?: boolean
  showReloadAllButton?: boolean
}

export default function LogEventsPanel({
  lockedContains,
  showLockedFilterHint = false,
  showClearButton = true,
  showReloadAllButton = true,
}: LogEventsPanelProps) {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const [events, setEvents] = useAtom(logEventsAtom)
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('all')
  const [containsFilter, setContainsFilter] = useState('')
  const [isConnecting, setIsConnecting] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [isReloadingAll, setIsReloadingAll] = useState(false)
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)
  const [filteredEvents, setFilteredEvents] = useState<LogEvent[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isMergingIncoming, setIsMergingIncoming] = useState(false)
  const eventsRef = useRef<LogEvent[]>([])
  const pendingIncomingRef = useRef<LogEvent[]>([])
  const mergeScheduledRef = useRef(false)

  useEffect(() => {
    eventsRef.current = events
  }, [events])

  const effectiveContains = lockedContains ?? containsFilter

  const scheduleIdleTask = useCallback((task: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      ;(
        window as Window & {
          requestIdleCallback: (cb: IdleRequestCallback) => number
        }
      ).requestIdleCallback(() => {
        task()
      })
      return
    }

    setTimeout(task, 0)
  }, [])

  const flushPendingIncoming = useCallback(() => {
    mergeScheduledRef.current = false
    const incoming = pendingIncomingRef.current
    if (incoming.length === 0) {
      setIsMergingIncoming(false)
      return
    }

    pendingIncomingRef.current = []
    setEvents((prev) => {
      const map = new Map<number, LogEvent>()
      for (const item of prev) map.set(item.id, item)
      for (const item of incoming) {
        if (typeof item?.id !== 'number') continue
        map.set(item.id, item)
      }
      return Array.from(map.values()).toSorted((a, b) => b.id - a.id)
    })

    setIsMergingIncoming(false)
  }, [setEvents])

  const enqueueIncoming = useCallback(
    (incoming: LogEvent[]) => {
      if (incoming.length === 0) return
      pendingIncomingRef.current.push(...incoming)
      setIsMergingIncoming(true)
      if (mergeScheduledRef.current) {
        return
      }

      mergeScheduledRef.current = true
      scheduleIdleTask(flushPendingIncoming)
    },
    [flushPendingIncoming, scheduleIdleTask],
  )

  useEffect(() => {
    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const runAsyncFilter = () => {
      setIsFiltering(true)
      const source = events
      const result: LogEvent[] = []
      let index = 0

      const runChunk = () => {
        if (cancelled) return

        const end = Math.min(index + FILTER_CHUNK_SIZE, source.length)
        for (; index < end; index += 1) {
          const event = source[index]
          const levelOk =
            levelFilter === 'all' || event.type === String(levelFilter)
          if (!levelOk) continue

          if (
            effectiveContains &&
            !event.msg.toLowerCase().includes(effectiveContains.toLowerCase())
          ) {
            continue
          }

          result.push(event)
        }

        if (index < source.length) {
          scheduleIdleTask(runChunk)
          return
        }

        if (!cancelled) {
          setFilteredEvents(result)
          setIsFiltering(false)
        }
      }

      runChunk()
    }

    debounceTimer = setTimeout(runAsyncFilter, FILTER_DEBOUNCE_MS)

    return () => {
      cancelled = true
      setIsFiltering(false)
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [events, levelFilter, effectiveContains, scheduleIdleTask])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE)),
    [filteredEvents.length],
  )

  const pageNumbers = useMemo(() => {
    const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = []
    if (totalPages <= 1) return [1]

    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis-left')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis-right')
    }

    pages.push(totalPages)
    return pages
  }, [currentPage, totalPages])

  const start = useMemo(() => {
    if (filteredEvents.length === 0) return 0
    return (currentPage - 1) * PAGE_SIZE + 1
  }, [currentPage, filteredEvents.length])

  const end = useMemo(
    () => Math.min(currentPage * PAGE_SIZE, filteredEvents.length),
    [currentPage, filteredEvents.length],
  )

  const visibleEvents = useMemo(
    () =>
      filteredEvents.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredEvents, currentPage],
  )

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const sendIncrementalList = useCallback(() => {
    const ok = sendEventWsCmd({ cmd: 'list' })
    if (!ok) {
      toast.danger('日志连接未就绪')
    }
  }, [])

  const sendFullList = useCallback(() => {
    const ok = sendEventWsCmd({ cmd: 'list' }, { forceFullList: true })
    if (!ok) {
      toast.danger('日志连接未就绪')
    }
    return ok
  }, [])

  const handleRefresh = useCallback(() => {
    sendIncrementalList()
  }, [sendIncrementalList])

  const handleReloadAll = useCallback(() => {
    setIsReloadingAll(true)
    pendingIncomingRef.current = []
    setEvents([])
    setFilteredEvents([])
    setCurrentPage(1)
    const ok = sendFullList()
    if (ok) {
      toast.success('已重新获取全部日志')
    }
    setIsReloadingAll(false)
  }, [sendFullList, setEvents])

  const handleClear = useCallback(async () => {
    setIsClearing(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/events`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`清空失败: ${response.status} ${response.statusText}`)
      }
      pendingIncomingRef.current = []
      setEvents([])
      setFilteredEvents([])
      setCurrentPage(1)
      toast.success('日志已清空')
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : '清空失败')
    } finally {
      setIsClearing(false)
    }
  }, [apiBaseUrl, setEvents])

  const handleToggleAutoRefresh = useCallback((next: boolean) => {
    const ok = setEventWsAutoRefresh(next)
    if (!ok) {
      toast.danger('日志连接未就绪')
    }
  }, [])

  useEffect(() => {
    setIsConnecting(true)

    const base = new URL(apiBaseUrl)
    const wsUrl = new URL('/api/events/_ws', base)
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    const release = acquireEventWs(wsUrl.toString(), {
      getAfter: () =>
        eventsRef.current.reduce(
          (max, item) => (item.id > max ? item.id : max),
          0,
        ),
      onEvents: (incoming) => {
        enqueueIncoming(incoming)
      },
      onOpen: () => {
        setIsConnecting(false)
      },
      onClose: () => {
        setIsConnecting(false)
      },
      onError: (message) => {
        toast.danger(message)
        setIsConnecting(false)
      },
      onAutoRefreshChange: (enabled) => {
        setIsAutoRefresh(enabled)
      },
    })

    return () => {
      release()
    }
  }, [apiBaseUrl, enqueueIncoming])

  return (
    <div className="space-y-4">
      <div className="flex flex-row flex-wrap items-center gap-3">
        <Select
          value={levelFilter}
          onChange={(value: Key | null) =>
            setLevelFilter(normalizeLevelFilter(value))
          }
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
              {LOG_LEVEL_OPTIONS.map((option) => (
                <ListBox.Item
                  key={option.id}
                  id={option.id}
                  textValue={option.label}
                >
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {lockedContains ? (
          <Input
            value={lockedContains}
            disabled
            className="w-full sm:w-72"
            aria-label="锁定日志过滤字符串"
          />
        ) : (
          <Input
            value={containsFilter}
            onChange={(e) => setContainsFilter(e.target.value)}
            placeholder={`包含过滤（${LOG_STRING_FILTER_FIELD.label}）`}
            className="w-full sm:w-72"
            aria-label="日志包含过滤"
          />
        )}

        {(isFiltering || isMergingIncoming) && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Spinner size="sm" />
            <span>{isFiltering ? '过滤中...' : '更新中...'}</span>
          </div>
        )}

        <Button
          onPress={handleRefresh}
          variant="outline"
          className="flex items-center gap-2"
          isDisabled={isConnecting}
        >
          <RefreshCcw />
          刷新
        </Button>

        {showReloadAllButton && (
          <Button
            onPress={handleReloadAll}
            variant="secondary"
            className="flex items-center gap-2"
            isDisabled={isConnecting || isReloadingAll}
          >
            <RotateCcw />
            {isReloadingAll ? '重载中...' : '重新获取所有日志'}
          </Button>
        )}

        {showClearButton && (
          <Button
            onPress={handleClear}
            variant="danger"
            className="flex items-center gap-2"
            isDisabled={isConnecting || isClearing}
          >
            <Trash2 />
            {isClearing ? '清空中...' : '清空日志'}
          </Button>
        )}

        <Switch isSelected={isAutoRefresh} onChange={handleToggleAutoRefresh}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label className="text-sm">自动刷新</Label>
          </Switch.Content>
        </Switch>
      </div>

      {showLockedFilterHint && lockedContains && (
        <p className="text-xs text-muted">
          当前模块已锁定过滤条件：{lockedContains}
        </p>
      )}

      <Virtualizer
        layout={TableLayout}
        layoutOptions={{
          headingHeight: 44,
          rowHeight: 96,
        }}
      >
        <Table variant="primary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="日志列表"
              className="h-[47.5vh] min-w-180 overflow-auto md:h-[55vh]"
            >
              <Table.Header className="h-full w-full">
                <Table.Column
                  isRowHeader
                  id="id"
                  minWidth={72}
                  defaultWidth={84}
                >
                  ID
                </Table.Column>
                <Table.Column id="ctime" minWidth={152} defaultWidth={172}>
                  时间
                </Table.Column>
                <Table.Column id="type" minWidth={84} defaultWidth={96}>
                  等级
                </Table.Column>
                <Table.Column id="msg">内容</Table.Column>
              </Table.Header>
              <Table.Body
                items={visibleEvents}
                renderEmptyState={() => (
                  <p className="text-muted">
                    {isConnecting ? '正在连接日志服务...' : '暂无日志'}
                  </p>
                )}
              >
                {(event) => {
                  const styles = getLogStyles(event.type)
                  return (
                    <Table.Row id={event.id}>
                      <Table.Cell>
                        <Chip size="sm" variant="soft">
                          <Chip.Label className="font-mono">
                            #{event.id}
                          </Chip.Label>
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-xs text-muted">
                        {new Date(event.ctime).toLocaleString()}
                      </Table.Cell>
                      <Table.Cell>
                        {event.type ? (
                          <Chip
                            size="sm"
                            color={styles.chipColor}
                            variant="soft"
                          >
                            <Chip.Label>{event.type}</Chip.Label>
                          </Chip>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <p
                          className={`whitespace-pre-wrap wrap-break-word text-sm leading-5 ${styles.text}`}
                        >
                          {event.msg}
                        </p>
                      </Table.Cell>
                    </Table.Row>
                  )
                }}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer>
            <Pagination size="sm">
              <Pagination.Summary>
                {start} 到 {end} / 共 {filteredEvents.length} 条
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={currentPage === 1}
                    onPress={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <Pagination.PreviousIcon />
                    上一页
                  </Pagination.Previous>
                </Pagination.Item>
                {pageNumbers.map((page) =>
                  page === 'ellipsis-left' || page === 'ellipsis-right' ? (
                    <Pagination.Item key={page}>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  ) : (
                    <Pagination.Item key={page}>
                      <Pagination.Link
                        isActive={page === currentPage}
                        onPress={() => setCurrentPage(page)}
                      >
                        {page}
                      </Pagination.Link>
                    </Pagination.Item>
                  ),
                )}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={currentPage === totalPages}
                    onPress={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    下一页
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </Table.Footer>
        </Table>
      </Virtualizer>
    </div>
  )
}
