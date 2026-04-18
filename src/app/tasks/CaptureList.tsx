import { Button, Card, Chip, Link, Separator, Spinner, Table } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link as RLink } from 'react-router'

import { lastCreatedCaptureAidAtom } from '@/atoms/tasks/addCapture'

import type { CaptureItem } from './types'

type CaptureTreeNode = {
  id: string
  nodeType: 'aid' | 'capture'
  aid: string | null
  capture?: CaptureItem
  children?: CaptureTreeNode[]
}

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

  const treeRows = useMemo<CaptureTreeNode[]>(() => {
    const groupedByAid = new Map<string, CaptureItem[]>()
    const noAidCaptures: CaptureItem[] = []

    for (const capture of captureList) {
      if (!capture.aid) {
        noAidCaptures.push(capture)
        continue
      }
      const existing = groupedByAid.get(capture.aid)
      if (existing) existing.push(capture)
      else groupedByAid.set(capture.aid, [capture])
    }

    const aidKeys = [...groupedByAid.keys()].toSorted((a, b) => {
      if (lastCreatedAid && a === lastCreatedAid) return -1
      if (lastCreatedAid && b === lastCreatedAid) return 1
      return a.localeCompare(b, 'zh-CN', { numeric: true })
    })

    const aidNodes: CaptureTreeNode[] = aidKeys.map((aid) => ({
      id: `aid:${aid}`,
      nodeType: 'aid',
      aid,
      children: (groupedByAid.get(aid) ?? []).map((capture) => ({
        id: `cid:${capture.cid}`,
        nodeType: 'capture',
        aid: capture.aid,
        capture,
      })),
    }))

    const noAidNodes: CaptureTreeNode[] = noAidCaptures.map((capture) => ({
      id: `cid:${capture.cid}`,
      nodeType: 'capture',
      aid: null,
      capture,
    }))

    return [...aidNodes, ...noAidNodes]
  }, [captureList, lastCreatedAid])

  const renderRow = (row: CaptureTreeNode) => (
    <Table.Row
      id={row.id}
      textValue={row.nodeType === 'aid' ? `AID ${row.aid}` : row.capture?.cid}
      className={
        lastCreatedAid && row.aid === lastCreatedAid
          ? row.nodeType === 'aid'
            ? 'bg-success/10'
            : 'bg-success/5'
          : undefined
      }
    >
      <Table.Cell
        textValue={row.nodeType === 'aid' ? (row.aid ?? '-') : row.capture?.cid}
      >
        {({ hasChildItems, isDisabled, isExpanded, isTreeColumn }) => (
          <span className="flex items-center gap-1">
            {hasChildItems && isTreeColumn ? (
              <Button
                isIconOnly
                aria-label="展开或收起"
                isDisabled={isDisabled}
                size="sm"
                slot="chevron"
                variant="ghost"
              >
                <ChevronRight
                  className={`size-4 text-muted transition-transform duration-150 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </Button>
            ) : (
              <span className="inline-block size-7" />
            )}
            {row.nodeType === 'aid' ? (
              <Link>
                <RLink to={`/tasks/videos/${row.aid}`}>{row.aid}</RLink>
              </Link>
            ) : (
              <Link>
                <RLink to={`/tasks/captures/${row.capture?.cid}`}>
                  {row.capture?.cid}
                </RLink>
              </Link>
            )}
          </span>
        )}
      </Table.Cell>
      <Table.Cell>
        {row.nodeType === 'aid' ? '-' : formatCaptureDate(row.capture?.pub ?? null)}
      </Table.Cell>
      <Table.Cell className="font-mono">
        {row.nodeType === 'aid' ? row.aid : row.capture?.aid ?? '-'}
      </Table.Cell>
      <Table.Cell>
        {row.nodeType === 'aid' ? (
          '-'
        ) : (
          <Chip
            size="sm"
            variant="soft"
            color={getVideoSourceStatusColor(row.capture?.videoSourceState ?? null)}
          >
            {getVideoSourceStatusLabel(row.capture?.videoSourceState ?? null)}
          </Chip>
        )}
      </Table.Cell>
      {row.children ? (
        <Table.Collection items={row.children}>{renderRow}</Table.Collection>
      ) : null}
    </Table.Row>
  )

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
        ) : treeRows.length === 0 ? (
          <p className="text-muted">暂无采集</p>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="采集列表"
                className="min-w-150"
                defaultExpandedKeys={
                  lastCreatedAid ? [`aid:${lastCreatedAid}`] : undefined
                }
                treeColumn="node"
              >
                <Table.Header>
                  <Table.Column isRowHeader id="node">
                    CID / AID
                  </Table.Column>
                  <Table.Column>发布时间</Table.Column>
                  <Table.Column>AID</Table.Column>
                  <Table.Column>视频源状态</Table.Column>
                </Table.Header>
                <Table.Body items={treeRows}>{renderRow}</Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card.Content>
    </Card>
  )
}
