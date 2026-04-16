import { Card, Chip, Link, Separator, Spinner, Table } from '@heroui/react'
import { Link as RLink } from 'react-router'
import { useAtomValue } from 'jotai'

import { lastCreatedCaptureAidAtom } from '@/atoms/tasks/addCapture'
import type { CaptureItem } from './types'

function formatCaptureDate(dateString: string | null): string {
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

export function CaptureList({
  captureList,
  isLoading,
}: {
  captureList: CaptureItem[]
  isLoading: boolean
}) {
  const lastCreatedAid = useAtomValue(lastCreatedCaptureAidAtom)

  // 如果有最后创建的 aid，则将对应的 captures 置顶
  const sortedCaptureList = lastCreatedAid
    ? [
        ...captureList.filter((c) => c.aid === lastCreatedAid),
        ...captureList.filter((c) => c.aid !== lastCreatedAid),
      ]
    : captureList

  return (
    <Card className="p-6">
      <Card.Header>
        <Card.Title>已有采集</Card.Title>
      </Card.Header>
      <Separator />
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : captureList.length === 0 ? (
          <p className="text-muted">暂无采集</p>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="采集列表" className="min-w-150">
                <Table.Header>
                  <Table.Column isRowHeader>CID</Table.Column>
                  <Table.Column>发布时间</Table.Column>
                  <Table.Column>AID</Table.Column>
                  <Table.Column>视频源状态</Table.Column>
                </Table.Header>
                <Table.Body items={sortedCaptureList}>
                  {(capture) => (
                    <Table.Row
                      id={capture.cid}
                      className={
                        lastCreatedAid && capture.aid === lastCreatedAid
                          ? 'bg-success/10'
                          : undefined
                      }
                    >
                      <Table.Cell>
                        <Link>
                          <RLink to={`/tasks/captures/${capture.cid}`}>
                            {capture.cid}
                          </RLink>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>{formatCaptureDate(capture.pub)}</Table.Cell>
                      <Table.Cell className="font-mono">
                        {capture.aid ?? '-'}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={getVideoSourceStatusColor(
                            capture.videoSourceState,
                          )}
                        >
                          {getVideoSourceStatusLabel(capture.videoSourceState)}
                        </Chip>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card.Content>
    </Card>
  )
}
