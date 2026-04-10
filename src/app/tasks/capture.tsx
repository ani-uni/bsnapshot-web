import {
  Button,
  Card,
  Chip,
  Link,
  Modal,
  Separator,
  Spinner,
  Table,
  toast,
} from '@heroui/react'
import { useAtomValue } from 'jotai'
import { Trash2 } from 'lucide-react'
import { Duration } from 'luxon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RLink, useNavigate, useParams } from 'react-router'

import LogEventsPanel from '@/app/events/module/LogEventsPanel'
import { apiBaseUrlAtom } from '@/atoms/api'
import { usersAtom, usersAutoRefreshAtom } from '@/atoms/users'
import { RequireConnection } from '@/components/RequireConnection'

type CaptureDetail = {
  cid: string
  pub: string | null
  upMid: string | null
  aid: string | null
  videoSourceState: number | null
}

type ClipInfo = {
  id: string
  cid: string
  start: number
  end: number
  episodeId: string | null
  danmakuStats: ClipDanmakuStats | null
}

type DanmakuStats = {
  count: number
}

type CaptureDanmakuStats = {
  count: number
  upCount: number
}

type ClipDanmakuStats = {
  count: number
  upCount: number
}

type FetchTask = {
  id: string
  cid: string
  type: 'RT' | 'HIS' | 'SP' | 'UP'
  status: 'DISABLED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  lastRunAt: string
  queueId: string | null
  createdAt: string
}

function formatTimestamp(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

function getVideoSourceStatusColor(
  state: number | null,
): 'success' | 'warning' | 'danger' | 'default' {
  switch (state) {
    case 0:
      return 'success'
    case 1:
      return 'warning'
    case 2:
      return 'danger'
    default:
      return 'default'
  }
}

function getVideoSourceStatusLabel(state: number | null): string {
  switch (state) {
    case 0:
      return '正常'
    case 1:
      return '仅UP可见'
    case 2:
      return '已失效'
    default:
      return '-'
  }
}

function getStatusColor(
  status: FetchTask['status'],
): 'default' | 'success' | 'danger' | 'accent' | 'warning' {
  switch (status) {
    case 'DISABLED':
      return 'default'
    case 'PENDING':
      return 'warning'
    case 'RUNNING':
      return 'accent'
    case 'DONE':
      return 'success'
    case 'FAILED':
      return 'danger'
  }
}

function getStatusLabel(status: FetchTask['status']): string {
  switch (status) {
    case 'DISABLED':
      return '已禁用'
    case 'PENDING':
      return '待处理'
    case 'RUNNING':
      return '运行中'
    case 'DONE':
      return '已完成'
    case 'FAILED':
      return '已失败'
  }
}

function getTaskTypeLabel(type: FetchTask['type']): string {
  switch (type) {
    case 'RT':
      return '实时弹幕'
    case 'HIS':
      return '历史弹幕'
    case 'SP':
      return '特殊弹幕'
    case 'UP':
      return '创作中心'
  }
}

function formatSeconds(s: number): string {
  return Duration.fromObject({ seconds: s }).toFormat('hh:mm:ss')
}

export default function CaptureDetailPage() {
  const { cid } = useParams<{ cid: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const users = useAtomValue(usersAtom)
  useAtomValue(usersAutoRefreshAtom)
  const navigate = useNavigate()

  const [capture, setCapture] = useState<CaptureDetail | null>(null)
  const [clips, setClips] = useState<ClipInfo[]>([])
  const [danmakuStats, setDanmakuStats] = useState<CaptureDanmakuStats | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoadingDanmaku, setIsLoadingDanmaku] = useState(false)
  const [fetchTasks, setFetchTasks] = useState<FetchTask[]>([])
  const [isFetchTaskToggling, setIsFetchTaskToggling] = useState<
    Record<string, boolean>
  >({})
  const [isFetchTaskRunning, setIsFetchTaskRunning] = useState<
    Record<string, boolean>
  >({})

  const fetchData = useCallback(async () => {
    if (!cid) return
    setIsLoading(true)
    try {
      const [captureRes, clipsRes, fetchTasksRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/tasks/captures/${cid}`),
        fetch(`${apiBaseUrl}/api/tasks/captures/${cid}/clips`),
        fetch(`${apiBaseUrl}/api/tasks/fetch/${cid}`),
      ])

      if (!captureRes.ok)
        throw new Error(`采集信息加载失败：HTTP ${captureRes.status}`)
      const captureData = (await captureRes.json()) as CaptureDetail
      setCapture(captureData)

      if (clipsRes.ok) {
        const clipsData = (await clipsRes.json()) as ClipInfo[]
        setClips(clipsData)
      }

      if (fetchTasksRes.ok) {
        const fetchTasksData = (await fetchTasksRes.json()) as FetchTask[]
        setFetchTasks(fetchTasksData)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, cid])

  const fetchDanmakuStats = useCallback(async () => {
    if (!cid) return
    setIsLoadingDanmaku(true)
    try {
      // 并行获取采集的弹幕统计（普通 + 创作中心）
      const [danmakuRes, upRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/tasks/captures/${cid}/danmaku/stats`),
        fetch(`${apiBaseUrl}/api/tasks/captures/${cid}/danmaku/stats?up=true`),
      ])

      const normalData = danmakuRes.ok
        ? ((await danmakuRes.json()) as DanmakuStats)
        : { count: 0 }
      const upData = upRes.ok
        ? ((await upRes.json()) as DanmakuStats)
        : { count: 0 }

      setDanmakuStats({
        count: normalData.count,
        upCount: upData.count,
      })
    } catch (error) {
      toast.danger(
        `加载弹幕统计失败：${error instanceof Error ? error.message : '未知错误'}`,
      )
    } finally {
      setIsLoadingDanmaku(false)
    }
  }, [apiBaseUrl, cid])

  const [loadingClipIds, setLoadingClipIds] = useState<Record<string, boolean>>(
    {},
  )

  const fetchClipDanmakuStats = useCallback(
    async (clip: ClipInfo) => {
      const clipId = clip.id
      if (loadingClipIds[clipId] || clip.danmakuStats) return
      setLoadingClipIds((prev) => ({ ...prev, [clipId]: true }))
      try {
        const [normalRes, upRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/tasks/clips/${clipId}/danmaku/stats`),
          fetch(
            `${apiBaseUrl}/api/tasks/clips/${clipId}/danmaku/stats?up=true`,
          ),
        ])

        const normalData = normalRes.ok
          ? ((await normalRes.json()) as DanmakuStats)
          : { count: 0 }
        const upData = upRes.ok
          ? ((await upRes.json()) as DanmakuStats)
          : { count: 0 }

        setClips((prev) =>
          prev.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  danmakuStats: {
                    count: normalData.count,
                    upCount: upData.count,
                  },
                }
              : c,
          ),
        )
        // setClipDanmakuStats((prev) => ({
        //   ...prev,
        //   [clipId]: {
        //     id: clipId,
        //     count: normalData.count,
        //     upCount: upData.count,
        //   },
        // }))
      } catch {
        setClips((prev) =>
          prev.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  danmakuStats: { count: 0, upCount: 0 },
                }
              : c,
          ),
        )
        // setClipDanmakuStats((prev) => ({
        //   ...prev,
        //   [clipId]: { id: clipId, count: 0, upCount: 0 },
        // }))
      } finally {
        setLoadingClipIds((prev) => {
          const { [clipId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [apiBaseUrl, loadingClipIds],
  )

  const fetchFetchTasks = useCallback(async () => {
    if (!cid) return
    try {
      const fetchTasksRes = await fetch(`${apiBaseUrl}/api/tasks/fetch/${cid}`)

      if (fetchTasksRes.ok) {
        const fetchTasksData = (await fetchTasksRes.json()) as FetchTask[]
        setFetchTasks(fetchTasksData)
      }
    } catch (error) {
      toast.danger(
        `刷新获取任务失败：${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }, [apiBaseUrl, cid])

  const handleDelete = async () => {
    if (!cid) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/captures/${cid}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('已删除')
      navigate('/tasks')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleToggleFetchTask = async (type: FetchTask['type']) => {
    if (!cid) return

    setIsFetchTaskToggling((prev) => ({ ...prev, [type]: true }))
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/fetch/${cid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: [type] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchData()
      toast.success(`${type} 任务已更新`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新失败：${errorMsg}`)
    } finally {
      setIsFetchTaskToggling((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleRunFetchTask = async (type: FetchTask['type']) => {
    if (!cid) return

    setIsFetchTaskRunning((prev) => ({ ...prev, [type]: true }))
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/fetch/${cid}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: [type], manual: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`${type} 任务已手动执行`)
      // 延迟刷新以获取最新状态
      setTimeout(() => void fetchFetchTasks(), 500)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`执行失败：${errorMsg}`)
    } finally {
      setIsFetchTaskRunning((prev) => ({ ...prev, [type]: false }))
    }
  }

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // 异步加载采集级弹幕统计
  useEffect(() => {
    if (cid) {
      void fetchDanmakuStats()
    }
  }, [cid, fetchDanmakuStats])

  const episodeColorMap = useMemo(() => {
    const colors = [
      'rgba(59, 130, 246, 0.15)', // blue
      'rgba(16, 185, 129, 0.15)', // emerald
      'rgba(245, 158, 11, 0.15)', // amber
      'rgba(168, 85, 247, 0.15)', // purple
      'rgba(239, 68, 68, 0.15)', // red
      'rgba(6, 182, 212, 0.15)', // cyan
      'rgba(236, 72, 153, 0.15)', // pink
      'rgba(132, 204, 22, 0.15)', // lime
    ]
    const map = new Map<string, string>()
    let idx = 0
    for (const clip of clips) {
      if (clip.episodeId && !map.has(clip.episodeId)) {
        map.set(clip.episodeId, colors[idx % colors.length])
        idx++
      }
    }
    return map
  }, [clips])

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchFetchTasks()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchFetchTasks])

  if (!cid) {
    return <div>无效的 CID</div>
  }

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold">采集详情</h1>

        {/* Info Card */}
        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>基本信息</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner color="current" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted">CID</div>
                  <div className="font-mono text-sm">{capture?.cid || cid}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">发布时间</div>
                  <div className="text-sm">
                    {formatTimestamp(capture?.pub ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">UP主 mid</div>
                  <div className="font-mono text-sm">
                    {capture?.upMid ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">AID</div>
                  <div className="font-mono text-sm">{capture?.aid ?? '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">视频源状态</div>
                  <div>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={getVideoSourceStatusColor(
                        capture?.videoSourceState ?? null,
                      )}
                    >
                      {getVideoSourceStatusLabel(
                        capture?.videoSourceState ?? null,
                      )}
                    </Chip>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">弹幕数</div>
                  {isLoadingDanmaku ? (
                    <div className="text-sm text-muted">加载中...</div>
                  ) : (
                    <div className="flex gap-4 text-sm">
                      <div>
                        {danmakuStats?.count !== null &&
                        danmakuStats?.count !== undefined
                          ? danmakuStats.count
                          : '-'}{' '}
                        <span className="text-xs text-muted">(标准接口)</span>
                      </div>
                      <div>
                        {danmakuStats?.upCount !== null &&
                        danmakuStats?.upCount !== undefined
                          ? danmakuStats.upCount
                          : '-'}{' '}
                        <span className="text-xs text-muted">(创作中心)</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    isPending={isDeleting}
                    onPress={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 />
                    删除
                  </Button>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Clips Card */}
        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>片段列表</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="片段列表" className="min-w-150">
                  <Table.Header>
                    <Table.Column isRowHeader>序号</Table.Column>
                    <Table.Column>时间范围</Table.Column>
                    <Table.Column>时长</Table.Column>
                    <Table.Column>归属EP</Table.Column>
                    <Table.Column>弹幕数</Table.Column>
                  </Table.Header>
                  <Table.Body
                    items={clips}
                    renderEmptyState={() => (
                      <p className="text-muted">暂无片段</p>
                    )}
                  >
                    {(clip) => {
                      // const stats = clipDanmakuStats[clip.id]
                      const stats = clip.danmakuStats
                      return (
                        <Table.Row
                          id={clip.id}
                          style={
                            clip.episodeId &&
                            episodeColorMap.has(clip.episodeId)
                              ? {
                                  backgroundColor: episodeColorMap.get(
                                    clip.episodeId,
                                  ),
                                }
                              : undefined
                          }
                        >
                          <Table.Cell>#{clips.indexOf(clip) + 1}</Table.Cell>
                          <Table.Cell className="font-mono">
                            {formatSeconds(clip.start)} -{' '}
                            {formatSeconds(clip.end)}
                          </Table.Cell>
                          <Table.Cell>
                            {formatSeconds(clip.end - clip.start)}
                          </Table.Cell>
                          <Table.Cell>
                            {clip.episodeId ? (
                              <Link>
                                <RLink to={`/groups/ep/${clip.episodeId}`}>
                                  {clip.episodeId}
                                </RLink>
                              </Link>
                            ) : (
                              '-'
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {stats ? (
                              <>
                                <span className="font-medium">
                                  {stats.count}
                                </span>
                                <span className="text-muted mx-1">/</span>
                                <span className="text-medium">
                                  {stats.upCount}
                                </span>
                              </>
                            ) : loadingClipIds[clip.id] ? (
                              <Spinner size="sm" />
                            ) : (
                              <Link
                                className="text-xs cursor-pointer"
                                onPress={() => fetchClipDanmakuStats(clip)}
                              >
                                点击加载
                              </Link>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      )
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card.Content>
        </Card>

        {/* Fetch Tasks Card */}
        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>请求任务</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            {fetchTasks.length === 0 ? (
              <p className="text-muted">暂无请求任务</p>
            ) : (
              <div className="space-y-3">
                {fetchTasks.map((task) => {
                  const isDisabled = task.status === 'DISABLED'
                  const isUPTask = task.type === 'UP'
                  const upUserExists = (users ?? []).some(
                    (u) => u.mid === capture?.upMid,
                  )

                  return (
                    <div
                      key={task.type}
                      className="flex items-center justify-between rounded border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Chip
                          color={getStatusColor(task.status)}
                          size="sm"
                          variant="soft"
                        >
                          {getStatusLabel(task.status)}
                        </Chip>
                        <div>
                          <div className="text-sm font-medium">
                            {getTaskTypeLabel(task.type)}
                            {task.type === 'UP' && (
                              <span className="ml-2 text-xs text-muted">
                                (创作中心接口，仅UP主可用)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted">
                            最后运行:{' '}
                            {new Date(task.lastRunAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          isPending={isFetchTaskRunning[task.type]}
                          isDisabled={isDisabled}
                          onPress={() => handleRunFetchTask(task.type)}
                        >
                          立即运行
                        </Button>
                        <Button
                          size="sm"
                          variant={isDisabled ? 'outline' : 'danger'}
                          isPending={isFetchTaskToggling[task.type]}
                          isDisabled={
                            isUPTask && (!capture?.upMid || !upUserExists)
                          }
                          onPress={() => handleToggleFetchTask(task.type)}
                        >
                          {isDisabled ? '启用' : '禁用'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Events Card */}
        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>日志</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            <LogEventsPanel
              lockedContains={`oid: ${cid}`}
              showLockedFilterHint
              showClearButton={false}
              showReloadAllButton={false}
            />
          </Card.Content>
        </Card>

        {/* Delete Dialog */}
        <Modal.Backdrop
          isOpen={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        >
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>确认删除</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p>确定要删除 CID {cid} 的采集吗？此操作无法撤销。</p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  isDisabled={isDeleting}
                  onPress={() => setShowDeleteDialog(false)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  isPending={isDeleting}
                  onPress={() => void handleDelete()}
                >
                  删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </div>
    </RequireConnection>
  )
}
