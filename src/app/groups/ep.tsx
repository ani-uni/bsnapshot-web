import {
  Button,
  Card,
  Link,
  Modal,
  Separator,
  Spinner,
  Table,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link as RLink, useNavigate, useParams } from 'react-router'
import { apiBaseUrlAtom } from '@/atoms/api'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import EditableText from '@/components/EditableText'
import { TMDB_IMAGE_PREFIX } from '@/constants/tmdb'

type EpisodeDetail = {
  id: string
  title: string | null
  sn: number | null
  seasonId: string // 'default' means no parent season
  tmdb: string | null
  bgmtv: number | null
}

type TMDBEpisodeInfo = {
  air_date: string | null
  crew?: Array<{
    department: string
    job: string
    credit_id: string
    adult: boolean
    gender: number
    id: number
    known_for_department: string
    name: string
    original_name: string
    popularity: number
    profile_path: string | null
  }>
  episode_number: number
  guest_stars?: Array<{
    character: string
    credit_id: string
    order: number
    adult: boolean
    gender: number
    id: number
    known_for_department: string
    name: string
    original_name: string
    popularity: number
    profile_path: string | null
  }>
  name: string
  overview: string
  id: number
  production_code: string | null
  runtime: number | null
  season_number: number
  still_path: string | null
  vote_average: number
  vote_count: number
}

type BgmTvEpisodeInfo = {
  id: number
  type: number
  name: string
  name_cn: string
  sort: number
  ep?: number
  airdate: string
  comment: number
  duration: string
  desc: string
  disc: number
  subject_id: number
}

type CaptureItem = {
  cid: string
  pub: number | null
  segs: string
  upMid: string | null
  upLatest: number | null
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

function episodeLabel(episode: EpisodeDetail) {
  if (episode.sn !== null) {
    return episode.title
      ? `第 ${episode.sn} 集 - ${episode.title}`
      : `第 ${episode.sn} 集`
  }
  return displayTitle(episode.title)
}

function toTmdbImageUrl(path?: string | null) {
  if (!path) return null
  return new URL(`w300${path}`, TMDB_IMAGE_PREFIX).toString()
}

export default function EpisodeDetailPage() {
  const { epid } = useParams<{ epid: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)

  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [seasonTitle, setSeasonTitle] = useState<string | null>(null)

  const [captureList, setCaptureList] = useState<CaptureItem[]>([])

  const [tmdbInfo, setTmdbInfo] = useState<TMDBEpisodeInfo | null>(null)
  const [bgmtvInfo, setBgmtvInfo] = useState<BgmTvEpisodeInfo | null>(null)
  const [isLoadingRef, setIsLoadingRef] = useState(false)

  const loadThirdPartyInfo = useCallback(
    async (data: EpisodeDetail) => {
      if (!data.tmdb && !data.bgmtv) return
      setIsLoadingRef(true)
      try {
        if (data.tmdb) {
          const res = await fetch(
            `${apiBaseUrl}/api/episodes/3rd/tmdb/info?urlc=${encodeURIComponent(data.tmdb)}`,
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const respData = (await res.json()) as {
            tv: { episode: TMDBEpisodeInfo }
          }
          setTmdbInfo(respData.tv.episode)
        } else if (data.bgmtv) {
          const res = await fetch(
            `${apiBaseUrl}/api/episodes/3rd/bgmtv/info?episode_id=${data.bgmtv}`,
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const respData = (await res.json()) as {
            v0: { episodes: { [key: string]: BgmTvEpisodeInfo } }
          }
          const episodeKey = Object.keys(respData.v0.episodes)[0]
          if (episodeKey) setBgmtvInfo(respData.v0.episodes[episodeKey])
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`加载引用信息失败：${errorMsg}`)
      } finally {
        setIsLoadingRef(false)
      }
    },
    [apiBaseUrl],
  )

  const fetchEpisode = useCallback(async () => {
    if (!epid) return
    setIsLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/episodes/${epid}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as EpisodeDetail
      setEpisode(data)

      // Fetch associated captures
      const capturesRes = await fetch(
        `${apiBaseUrl}/api/episodes/${epid}/captures`,
      )
      if (capturesRes.ok) {
        const capturesData = (await capturesRes.json()) as CaptureItem[]
        setCaptureList(capturesData)
      }

      let sTitle: string | null = null
      if (data.seasonId !== 'default') {
        const seasonRes = await fetch(
          `${apiBaseUrl}/api/seasons/${data.seasonId}`,
        )
        if (seasonRes.ok) {
          const seasonData = (await seasonRes.json()) as {
            title: string | null
          }
          sTitle = seasonData.title
          setSeasonTitle(sTitle)
        }
      }

      setBreadcrumbs(
        data.seasonId !== 'default'
          ? [
              { label: '合集', href: '/groups' },
              {
                label: displayTitle(sTitle),
                href: `/groups/ss/${data.seasonId}`,
              },
              { label: episodeLabel(data) },
            ]
          : [{ label: '合集', href: '/groups' }, { label: episodeLabel(data) }],
      )

      void loadThirdPartyInfo(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [epid, apiBaseUrl, setBreadcrumbs, loadThirdPartyInfo])

  const handleSaveTitle = async (title: string) => {
    const res = await fetch(`${apiBaseUrl}/api/episodes/${epid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as EpisodeDetail
    setEpisode(data)
    setBreadcrumbs(
      data.seasonId !== 'default'
        ? [
            { label: '合集', href: '/groups' },
            {
              label: displayTitle(seasonTitle),
              href: `/groups/ss/${data.seasonId}`,
            },
            { label: episodeLabel(data) },
          ]
        : [{ label: '合集', href: '/groups' }, { label: episodeLabel(data) }],
    )
    toast.success('标题已更新')
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/episodes/${epid}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('已删除')
      navigate(
        episode?.seasonId !== 'default' && episode?.seasonId
          ? `/groups/ss/${episode.seasonId}`
          : '/groups',
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  useEffect(() => {
    void fetchEpisode()
  }, [fetchEpisode])

  if (!epid) {
    return <div>无效的 Episode ID</div>
  }

  const hasRef = episode?.tmdb != null || episode?.bgmtv != null

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>基本信息</Card.Title>
        </Card.Header>
        <Separator />
        <Card.Content>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm text-muted">Episode ID</div>
                <div className="font-mono text-sm">{episode?.id || '-'}</div>
              </div>

              {episode?.sn != null && (
                <div>
                  <div className="mb-2 text-sm text-muted">集数</div>
                  <div className="text-sm">第 {episode.sn} 集</div>
                </div>
              )}

              <div>
                <div className="mb-2 text-sm text-muted">标题</div>
                <EditableText
                  value={episode?.title ?? null}
                  onSave={handleSaveTitle}
                  placeholder="输入剧集名称"
                  isDisabled={episode?.tmdb != null || episode?.bgmtv != null}
                />
              </div>

              {episode?.seasonId !== 'default' && episode?.seasonId && (
                <div>
                  <div className="mb-2 text-sm text-muted">所属季度</div>
                  <div className="text-sm">{displayTitle(seasonTitle)}</div>
                </div>
              )}

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

      {/* Ref Info */}
      {hasRef && (
        <Card className="p-6">
          <Card.Header>
            <Card.Title>{episode?.tmdb ? 'TMDB' : 'BgmTV'}</Card.Title>
            <div className="font-mono text-xs text-muted break-all">
              {episode?.tmdb ?? `episode_id: ${episode?.bgmtv}`}
            </div>
          </Card.Header>
          <Separator />
          <Card.Content>
            {isLoadingRef ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : episode?.tmdb && tmdbInfo ? (
              <div className="flex gap-4">
                {tmdbInfo.still_path && (
                  <div className="shrink-0">
                    <img
                      src={toTmdbImageUrl(tmdbInfo.still_path) || ''}
                      alt={tmdbInfo.name}
                      className="h-auto w-36 rounded"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {tmdbInfo.name && (
                    <div className="text-lg font-semibold">{tmdbInfo.name}</div>
                  )}
                  <div className="flex gap-4 text-sm text-muted">
                    {tmdbInfo.episode_number != null && (
                      <span>第 {tmdbInfo.episode_number} 集</span>
                    )}
                    {tmdbInfo.air_date && <span>{tmdbInfo.air_date}</span>}
                    {tmdbInfo.vote_average != null && (
                      <span>评分 {tmdbInfo.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                  {tmdbInfo.overview && (
                    <p className="text-sm text-fg/70">{tmdbInfo.overview}</p>
                  )}
                </div>
              </div>
            ) : episode?.bgmtv && bgmtvInfo ? (
              <div className="space-y-2">
                <div className="text-lg font-semibold">
                  {bgmtvInfo.name_cn || bgmtvInfo.name}
                </div>
                {bgmtvInfo.name_cn && bgmtvInfo.name !== bgmtvInfo.name_cn && (
                  <div className="text-sm text-fg/60">{bgmtvInfo.name}</div>
                )}
                <div className="flex gap-4 text-sm text-muted">
                  {bgmtvInfo.airdate && <span>{bgmtvInfo.airdate}</span>}
                  {bgmtvInfo.duration && (
                    <span>时长：{bgmtvInfo.duration}</span>
                  )}
                </div>
                {bgmtvInfo.desc && (
                  <p className="text-sm text-fg/70">{bgmtvInfo.desc}</p>
                )}
              </div>
            ) : null}
          </Card.Content>
        </Card>
      )}

      {/* Captures Card */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>采集</Card.Title>
        </Card.Header>
        <Separator />
        <Card.Content>
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="采集列表">
                <Table.Header>
                  <Table.Column isRowHeader>CID</Table.Column>
                  <Table.Column>发布时间</Table.Column>
                  <Table.Column>UP主 mid</Table.Column>
                </Table.Header>
                <Table.Body
                  items={captureList}
                  renderEmptyState={() => (
                    <p className="text-muted">暂无关联采集</p>
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
                      <Table.Cell>
                        {capture.pub != null
                          ? new Date(capture.pub).toLocaleString()
                          : '-'}
                      </Table.Cell>
                      <Table.Cell className="font-mono">
                        {capture.upMid ?? '-'}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
              <p>
                确定要删除「{episode ? episodeLabel(episode) : ''}
                」吗？此操作不可撤销。
              </p>
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
                onPress={handleDelete}
              >
                确认删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
