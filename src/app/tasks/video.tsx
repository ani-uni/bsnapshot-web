import {
  Button,
  Card,
  Chip,
  Link,
  Separator,
  Spinner,
  Table,
  toast,
} from '@heroui/react'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RLink, useParams } from 'react-router'

import { usersAtom, usersAutoRefreshAtom } from '@/atoms/users'
import { RequireConnection } from '@/components/RequireConnection'
import { useApi } from '@/hooks/useApi'

import type { CaptureItem } from './types'

type TaskType = 'RT' | 'HIS' | 'SP' | 'UP'
type TaskStatus = 'DISABLED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

type FetchTask = {
  id: string
  cid: string
  type: TaskType
  status: TaskStatus
  lastRunAt: string
  queueId: string | null
  createdAt: string
}

type VideoSourceDetail = {
  id: string
  aid: string
  lastRunAt: string
  deadAt: string | null
  upCanSee: boolean
  reason: string | null
}

type AidTaskAggregateState = 'enabled' | 'disabled' | 'mixed'

type AidTaskAggregate = {
  type: TaskType
  state: AidTaskAggregateState
  enabledCount: number
  disabledCount: number
  missingCount: number
  totalCount: number
}

const TASK_TYPES: TaskType[] = ['RT', 'HIS', 'SP', 'UP']

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

function getTaskTypeLabel(type: TaskType): string {
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

function getAggregateStatusLabel(state: AidTaskAggregateState): string {
  switch (state) {
    case 'disabled':
      return '已禁用'
    case 'enabled':
      return '已启用'
    case 'mixed':
      return '状态不一致'
  }
}

function getAggregateStatusColor(
  state: AidTaskAggregateState,
): 'default' | 'success' | 'warning' {
  switch (state) {
    case 'disabled':
      return 'default'
    case 'enabled':
      return 'success'
    case 'mixed':
      return 'warning'
  }
}

function getVideoSourceState(
  videoSource: VideoSourceDetail | null,
): number | null {
  if (!videoSource) return null
  if (!videoSource.deadAt) return 0
  return videoSource.upCanSee ? 1 : 2
}

export default function VideoDetailPage() {
  const { aid } = useParams<{ aid: string }>()
  const api = useApi()
  const users = useAtomValue(usersAtom)
  useAtomValue(usersAutoRefreshAtom)

  const [videoSource, setVideoSource] = useState<VideoSourceDetail | null>(null)
  const [captures, setCaptures] = useState<CaptureItem[]>([])
  const [taskStatusByCid, setTaskStatusByCid] = useState<
    Record<string, Partial<Record<TaskType, TaskStatus>>>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [isTaskUpdating, setIsTaskUpdating] = useState<
    Record<TaskType, boolean>
  >({
    RT: false,
    HIS: false,
    SP: false,
    UP: false,
  })

  const fetchData = useCallback(async () => {
    if (!aid) return

    setIsLoading(true)
    try {
      const [videoSourceRes, capturesRes] = await Promise.all([
        api(`api/tasks/video-sources/${aid}`),
        api('api/tasks/captures'),
      ])

      if (videoSourceRes.ok) {
        const sourceData = (await videoSourceRes.json()) as VideoSourceDetail
        setVideoSource(sourceData)
      } else {
        setVideoSource(null)
      }

      if (!capturesRes.ok) {
        throw new Error(`采集列表加载失败：HTTP ${capturesRes.status}`)
      }

      const allCaptures = (await capturesRes.json()) as CaptureItem[]
      const aidCaptures = allCaptures.filter((capture) => capture.aid === aid)
      setCaptures(aidCaptures)

      const taskResults = await Promise.all(
        aidCaptures.map(async (capture) => {
          try {
            const fetchTasksRes = await api(`api/tasks/fetch/${capture.cid}`)
            if (!fetchTasksRes.ok)
              throw new Error(`HTTP ${fetchTasksRes.status}`)
            const fetchTasks = (await fetchTasksRes.json()) as FetchTask[]
            return [capture.cid, fetchTasks] as const
          } catch {
            return [capture.cid, null] as const
          }
        }),
      )

      const nextTaskStatusByCid: Record<
        string,
        Partial<Record<TaskType, TaskStatus>>
      > = {}

      for (const [cid, fetchTasks] of taskResults) {
        if (!fetchTasks) {
          nextTaskStatusByCid[cid] = {}
          continue
        }

        const statusByType: Partial<Record<TaskType, TaskStatus>> = {}
        for (const task of fetchTasks) {
          statusByType[task.type] = task.status
        }
        nextTaskStatusByCid[cid] = statusByType
      }

      setTaskStatusByCid(nextTaskStatusByCid)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载 AID 详情失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [aid, api])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const taskAggregates = useMemo<AidTaskAggregate[]>(() => {
    return TASK_TYPES.map((type) => {
      let enabledCount = 0
      let disabledCount = 0
      let missingCount = 0

      for (const capture of captures) {
        const status = taskStatusByCid[capture.cid]?.[type]
        if (!status) {
          missingCount++
          continue
        }

        if (status === 'DISABLED') disabledCount++
        else enabledCount++
      }

      const totalCount = captures.length
      let state: AidTaskAggregateState = 'mixed'

      if (totalCount === 0) {
        state = 'disabled'
      } else if (missingCount > 0) {
        state = 'mixed'
      } else if (disabledCount === totalCount) {
        state = 'disabled'
      } else if (enabledCount === totalCount) {
        state = 'enabled'
      } else {
        state = 'mixed'
      }

      return {
        type,
        state,
        enabledCount,
        disabledCount,
        missingCount,
        totalCount,
      }
    })
  }, [captures, taskStatusByCid])

  const handleSetTaskStatus = async (
    type: TaskType,
    target: 'enabled' | 'disabled',
  ) => {
    if (!aid || captures.length === 0) return

    const pendingCaptures = captures.filter((capture) => {
      const status = taskStatusByCid[capture.cid]?.[type]
      if (!status) return false
      const isDisabled = status === 'DISABLED'
      return target === 'enabled' ? isDisabled : !isDisabled
    })

    if (pendingCaptures.length === 0) {
      toast.success(`无需变更 ${getTaskTypeLabel(type)} 状态`)
      return
    }

    setIsTaskUpdating((prev) => ({ ...prev, [type]: true }))
    try {
      const results = await Promise.allSettled(
        pendingCaptures.map(async (capture) => {
          const res = await api(`api/tasks/fetch/${capture.cid}`, {
            method: 'PATCH',
            json: { types: [type] },
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
        }),
      )

      const failedCount = results.filter(
        (result) => result.status === 'rejected',
      ).length
      const successCount = pendingCaptures.length - failedCount

      if (failedCount > 0) {
        toast.danger(
          `${getTaskTypeLabel(type)} 已更新 ${successCount} 项，失败 ${failedCount} 项`,
        )
      } else {
        toast.success(`${getTaskTypeLabel(type)} 已批量更新`)
      }

      await fetchData()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`批量更新失败：${errorMsg}`)
    } finally {
      setIsTaskUpdating((prev) => ({ ...prev, [type]: false }))
    }
  }

  if (!aid) {
    return <div>无效的 AID</div>
  }

  const upTaskAvailable = captures.some((capture) => {
    if (!capture.upMid) return false
    return (users ?? []).some((user) => user.mid === capture.upMid)
  })

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold">AID 任务详情</h1>

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
                  <div className="text-sm text-muted">AID</div>
                  <div className="font-mono text-sm">{aid}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">视频源状态</div>
                  <div>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={getVideoSourceStatusColor(
                        getVideoSourceState(videoSource),
                      )}
                    >
                      {getVideoSourceStatusLabel(
                        getVideoSourceState(videoSource),
                      )}
                    </Chip>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">上次健康检查</div>
                  <div className="text-sm">
                    {formatTimestamp(videoSource?.lastRunAt ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">失效时间</div>
                  <div className="text-sm">
                    {formatTimestamp(videoSource?.deadAt ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">原因</div>
                  <div className="text-sm">{videoSource?.reason ?? '-'}</div>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>请求任务（AID 统一管理）</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            {captures.length === 0 ? (
              <p className="text-muted">当前 AID 下暂无采集</p>
            ) : (
              <div className="space-y-3">
                {taskAggregates.map((task) => {
                  const isUPTask = task.type === 'UP'
                  const disableUPActions = isUPTask && !upTaskAvailable

                  return (
                    <div
                      key={task.type}
                      className="flex items-center justify-between rounded border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Chip
                          color={getAggregateStatusColor(task.state)}
                          size="sm"
                          variant="soft"
                        >
                          {getAggregateStatusLabel(task.state)}
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
                            启用 {task.enabledCount} / 禁用 {task.disabledCount}
                            {task.missingCount > 0
                              ? ` / 未知 ${task.missingCount}`
                              : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.state === 'mixed' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              isPending={isTaskUpdating[task.type]}
                              isDisabled={disableUPActions}
                              onPress={() =>
                                void handleSetTaskStatus(task.type, 'enabled')
                              }
                            >
                              统一启用
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              isPending={isTaskUpdating[task.type]}
                              isDisabled={disableUPActions}
                              onPress={() =>
                                void handleSetTaskStatus(task.type, 'disabled')
                              }
                            >
                              统一禁用
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant={
                              task.state === 'disabled' ? 'outline' : 'danger'
                            }
                            isPending={isTaskUpdating[task.type]}
                            isDisabled={disableUPActions}
                            onPress={() =>
                              void handleSetTaskStatus(
                                task.type,
                                task.state === 'disabled'
                                  ? 'enabled'
                                  : 'disabled',
                              )
                            }
                          >
                            {task.state === 'disabled' ? '启用' : '禁用'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="mb-6 p-6">
          <Card.Header>
            <Card.Title>该 AID 下的采集</Card.Title>
          </Card.Header>
          <Separator />
          <Card.Content>
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="AID 采集列表" className="min-w-150">
                  <Table.Header>
                    <Table.Column isRowHeader>CID</Table.Column>
                    <Table.Column>发布时间</Table.Column>
                    <Table.Column>视频源状态</Table.Column>
                  </Table.Header>
                  <Table.Body
                    items={captures}
                    renderEmptyState={() => (
                      <p className="text-muted">暂无采集</p>
                    )}
                  >
                    {(capture) => (
                      <Table.Row id={capture.cid}>
                        <Table.Cell>
                          <Link>
                            <RLink to={`/tasks/captures/${capture.cid}`}>
                              {capture.cid}
                            </RLink>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>{formatTimestamp(capture.pub)}</Table.Cell>
                        <Table.Cell>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={getVideoSourceStatusColor(
                              capture.videoSourceState,
                            )}
                          >
                            {getVideoSourceStatusLabel(
                              capture.videoSourceState,
                            )}
                          </Chip>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card.Content>
        </Card>
      </div>
    </RequireConnection>
  )
}
