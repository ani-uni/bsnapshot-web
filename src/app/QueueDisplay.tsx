import { Button, Card, Modal, Surface } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useApi } from '@/hooks/useApi'

type QueueTask = {
  id?: string | null
  priority?: number | string
  startTime?: number | string
  params?: {
    type?: string | null
    oid?: number | string | null
  } | null
}

const toSingleLineToml = (id?: string | null) => {
  if (!id) return ''
  const normalized = id.replace(/\\n/g, '\n')
  return normalized
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const formatStartTime = (value?: number | string) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleString()
    }
    return value
  }
  if (Number.isFinite(value)) {
    return new Date(value).toLocaleString()
  }
  return String(value)
}

export function QueueDisplay() {
  const api = useApi()
  const [tasks, setTasks] = useState<QueueTask[]>([])
  const [, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api('api/tasks/queue')
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }
      const data = (await response.json()) as QueueTask[]
      setTasks(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '请求失败')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchQueue()
    const intervalId = setInterval(fetchQueue, 5000)
    return () => clearInterval(intervalId)
  }, [fetchQueue])

  const pendingCount = useMemo(() => tasks.length, [tasks])
  const detailToml = useMemo(() => toSingleLineToml(detailId), [detailId])

  return (
    <Card className="border border-border/60">
      <Card.Content className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <div>
            <p className="text-sm text-muted-foreground">队列显示</p>
            <p className="text-lg font-semibold text-foreground">
              当前 {pendingCount} 个请求等待发起
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {lastUpdated ? (
              <span>更新于 {lastUpdated.toLocaleTimeString()}</span>
            ) : (
              <span>等待更新</span>
            )}
            <span className="rounded-full border border-border/60 px-2 py-1 text-xs">
              {isExpanded ? '收起' : '展开'}
            </span>
          </div>
        </button>
      </Card.Content>

      {isExpanded ? (
        <Card.Content className="border-t border-border/60 px-6 py-4">
          {error ? (
            <Surface
              variant="secondary"
              className="px-4 py-3 text-sm text-danger"
            >
              获取队列失败：{error}
            </Surface>
          ) : tasks.length === 0 ? (
            <Surface
              variant="secondary"
              className="px-4 py-3 text-sm text-muted"
            >
              当前没有等待发起的请求
            </Surface>
          ) : (
            <Surface
              variant="secondary"
              className="max-h-80 divide-y divide-border/60 overflow-y-auto"
            >
              <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-2">Priority</div>
                <div className="col-span-3">StartTime</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-2">OID</div>
                <div className="col-span-2 text-right">操作</div>
              </div>
              {tasks.map((task, index) => (
                <div
                  key={task.id ?? `${task.params?.type ?? 'task'}-${index}`}
                  className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="col-span-2 font-medium">
                    {task.priority ?? '-'}
                  </div>
                  <div className="col-span-3 text-muted-foreground">
                    {formatStartTime(task.startTime)}
                  </div>
                  <div className="col-span-3">{task.params?.type ?? '-'}</div>
                  <div className="col-span-2 text-muted-foreground">
                    {task.params?.oid ?? '-'}
                  </div>
                  <div className="col-span-2 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDetailId(task.id ?? '')
                        setIsDetailOpen(true)
                      }}
                    >
                      详情
                    </Button>
                  </div>
                </div>
              ))}
            </Surface>
          )}
        </Card.Content>
      ) : null}

      <Modal.Backdrop isOpen={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <Modal.Container size="sm">
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>请求详情</Modal.Heading>
              <p className="text-sm text-muted-foreground">
                id 将以单行 TOML 展示
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="rounded-md border border-border/60 bg-surface-secondary px-3 py-2 font-mono text-sm text-foreground">
                {detailToml || '无可用 id'}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Card>
  )
}
