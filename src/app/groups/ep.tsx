import {
  Button,
  ButtonGroup,
  Card,
  Chip,
  Dropdown,
  Header,
  Label,
  Link,
  Modal,
  Separator,
  Spinner,
  Table,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link as RLink, useNavigate, useParams } from 'react-router'

import { renderFilenameTemplate } from '@/app/groups/filename'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import {
  danmakuExportFileNameTemplateAtom,
  lastUsedDanmakuExportFormatAtom,
} from '@/atoms/groups/export'
import EditableText from '@/components/EditableText'
import FastCapModal, { type FastCapModalState } from '@/components/FastCapModal'
import { TMDB_IMAGE_PREFIX } from '@/constants/tmdb'
import { useApi } from '@/hooks/useApi'

import { formatSn } from './sn'

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
  pub: string | null
  segs: string
  upMid: string | null
  upLatest: string | null
  aid: string | null
  videoSourceState: number | null
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

type DanmakuStats = {
  count: number
}

type EpisodeDanmakuStats = {
  count: number
  upCount: number
}

type DanmakuExportFormat =
  | 'danuni.json'
  | 'danuni.min.json'
  | 'danuni.binpb'
  | 'bili.xml'
  | 'dplayer.json'
  | 'artplayer.json'
  | 'ddplay.json'

type DanmakuExportOption = {
  format: DanmakuExportFormat
  label: string
  fileExt: string
  group: 'danuni' | 'bili' | 'other'
}

type DanmakuExportSource = {
  key: 'normal' | 'up'
  label: string
  up: boolean
  count: number
}

const DANMAKU_EXPORT_OPTIONS: DanmakuExportOption[] = [
  {
    format: 'danuni.json',
    label: 'DanUni JSON',
    fileExt: 'danuni.json',
    group: 'danuni',
  },
  {
    format: 'danuni.min.json',
    label: 'DanUni Min JSON',
    fileExt: 'danuni.min.json',
    group: 'danuni',
  },
  {
    format: 'danuni.binpb',
    label: 'DanUni BinPB',
    fileExt: 'danuni.binpb',
    group: 'danuni',
  },
  {
    format: 'bili.xml',
    label: 'Bili XML',
    fileExt: 'bili.xml',
    group: 'bili',
  },
  {
    format: 'dplayer.json',
    label: 'DPlayer JSON',
    fileExt: 'dplayer.json',
    group: 'other',
  },
  {
    format: 'artplayer.json',
    label: 'Artplayer JSON',
    fileExt: 'artplayer.json',
    group: 'other',
  },
  {
    format: 'ddplay.json',
    label: 'DDPlay JSON',
    fileExt: 'ddplay.json',
    group: 'other',
  },
]

const DANMAKU_EXPORT_GROUPS: Array<{
  key: DanmakuExportOption['group']
  label: string
}> = [
  { key: 'danuni', label: 'DanUni' },
  { key: 'bili', label: 'bili' },
  { key: 'other', label: '其它' },
]

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

function episodeLabel(episode: EpisodeDetail) {
  if (episode.sn !== null) {
    const snDisplay = formatSn(episode.sn)
    return episode.title ? `${snDisplay} - ${episode.title}` : snDisplay
  }
  return displayTitle(episode.title)
}

function toTmdbImageUrl(path?: string | null) {
  if (!path) return null
  return new URL(`w300${path}`, TMDB_IMAGE_PREFIX).toString()
}

export default function EpisodeDetailPage() {
  const { epid } = useParams<{ epid: string }>()
  const api = useApi()
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)

  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [showFastCapDialog, setShowFastCapDialog] = useState(false)
  const [fastCapExportState, setFastCapExportState] = useState<{
    status: FastCapModalState
    content: string
  }>({
    status: 'idle',
    content: '',
  })
  const [lastUsedFormat, setLastUsedFormat] = useAtom(
    lastUsedDanmakuExportFormatAtom,
  )
  const danmakuExportFileNameTemplate = useAtomValue(
    danmakuExportFileNameTemplateAtom,
  )
  const [seasonTitle, setSeasonTitle] = useState<string | null>(null)

  const [captureList, setCaptureList] = useState<CaptureItem[]>([])
  const [danmakuStats, setDanmakuStats] = useState<EpisodeDanmakuStats | null>(
    null,
  )
  const [isLoadingDanmaku, setIsLoadingDanmaku] = useState(false)

  const [tmdbInfo, setTmdbInfo] = useState<TMDBEpisodeInfo | null>(null)
  const [bgmtvInfo, setBgmtvInfo] = useState<BgmTvEpisodeInfo | null>(null)
  const [isLoadingRef, setIsLoadingRef] = useState(false)

  const loadThirdPartyInfo = useCallback(
    async (data: EpisodeDetail) => {
      if (!data.tmdb && !data.bgmtv) return
      setIsLoadingRef(true)
      try {
        if (data.tmdb) {
          const res = await api(
            `api/episodes/3rd/tmdb/info?urlc=${encodeURIComponent(data.tmdb)}`,
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const respData = (await res.json()) as {
            tv: { episode: TMDBEpisodeInfo }
          }
          setTmdbInfo(respData.tv.episode)
        } else if (data.bgmtv) {
          const res = await api(
            `api/episodes/3rd/bgmtv/info?episode_id=${data.bgmtv}`,
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
    [api],
  )

  const fetchEpisode = useCallback(async () => {
    if (!epid) return
    setIsLoading(true)
    try {
      const res = await api(`api/episodes/${epid}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as EpisodeDetail
      setEpisode(data)

      // Fetch associated captures
      const capturesRes = await api(`api/episodes/${epid}/captures`)
      if (capturesRes.ok) {
        const capturesData = (await capturesRes.json()) as CaptureItem[]
        setCaptureList(capturesData)
      }

      setIsLoadingDanmaku(true)
      try {
        const [danmakuRes, upRes] = await Promise.all([
          api(`api/episodes/${epid}/danmaku/stats`),
          api(`api/episodes/${epid}/danmaku/stats?up=true`),
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
      } finally {
        setIsLoadingDanmaku(false)
      }

      let sTitle: string | null = null
      if (data.seasonId !== 'default') {
        const seasonRes = await api(`api/seasons/${data.seasonId}`)
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
  }, [epid, api, setBreadcrumbs, loadThirdPartyInfo])

  const handleSaveTitle = async (title: string) => {
    const res = await api(`api/episodes/${epid}`, {
      method: 'PATCH',
      json: { title },
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
      const res = await api(`api/episodes/${epid}`, {
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

  const handleExportDanmaku = async (
    option: DanmakuExportOption,
    source: DanmakuExportSource,
  ) => {
    if (!epid || !episode) return
    const exportKey = `${source.key}:${option.format}`
    setLastUsedFormat(option.format)
    setExportingKey(exportKey)
    try {
      const exportUrl = `api/episodes/${epid}/danmaku/${option.format}${source.up ? '?up=true' : ''}`
      const response = await fetch(exportUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()

      // 使用模板生成文件名
      const generatedFileNameBase = renderFilenameTemplate(
        danmakuExportFileNameTemplate,
        { id: episode.id, sn: episode.sn, title: episode.title },
        {
          id: episode.seasonId !== 'default' ? episode.seasonId : '',
          title: episode.seasonId !== 'default' ? seasonTitle : null,
        },
        option.fileExt,
      )
      const fileName = `${generatedFileNameBase}`

      // 使用 blob 下载
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      toast.success(`已导出 ${source.label} - ${option.label}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`导出失败：${errorMsg}`)
    } finally {
      setExportingKey(null)
    }
  }

  const handleOpenFastCapExport = async () => {
    if (!epid) return

    setShowFastCapDialog(true)
    setFastCapExportState({ status: 'loading', content: '' })

    try {
      const response = await fetch(`api/episodes/${epid}/fastcap`)
      const text = await response.text()
      if (!response.ok) {
        throw new Error(text.trim() || `HTTP ${response.status}`)
      }
      setFastCapExportState({ status: 'success', content: text.trim() })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      setFastCapExportState({ status: 'error', content: errorMsg })
    }
  }

  useEffect(() => {
    void fetchEpisode()
  }, [fetchEpisode])

  if (!epid) {
    return <div>无效的 Episode ID</div>
  }

  const hasRef = episode?.tmdb != null || episode?.bgmtv != null
  const exportSources: DanmakuExportSource[] = [
    {
      key: 'normal',
      label: '标准接口',
      up: false,
      count: danmakuStats?.count ?? 0,
    },
    {
      key: 'up',
      label: '创作中心',
      up: true,
      count: danmakuStats?.upCount ?? 0,
    },
  ]

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
                  <div className="text-sm">{formatSn(episode.sn)}</div>
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

              <div>
                <div className="mb-2 text-sm text-muted">弹幕数</div>
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

              <div className="flex justify-end gap-2">
                <Button
                  variant="tertiary"
                  isDisabled={
                    isLoading ||
                    !episode ||
                    ((danmakuStats?.count ?? 0) === 0 &&
                      (danmakuStats?.upCount ?? 0) === 0)
                  }
                  onPress={() => setShowExportDialog(true)}
                >
                  导出弹幕
                </Button>
                <Button
                  variant="tertiary"
                  isDisabled={isLoading || !episode}
                  isPending={fastCapExportState.status === 'loading'}
                  onPress={() => void handleOpenFastCapExport()}
                >
                  导出 FastCap 配置
                </Button>
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

      {/* Export Danmaku Dialog */}
      <Modal.Backdrop
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>导出弹幕</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-3 text-sm text-muted">选择导出格式</p>
              <div className="space-y-4">
                {exportSources.map((source) => (
                  <div
                    key={source.key}
                    className="rounded border border-border p-3"
                  >
                    <div className="mb-2 text-sm font-medium">
                      {source.label}
                      <span className="ml-2 text-xs text-muted">
                        ({source.count})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const lastUsedOption =
                          DANMAKU_EXPORT_OPTIONS.find(
                            (option) => option.format === lastUsedFormat,
                          ) ?? DANMAKU_EXPORT_OPTIONS[0]
                        const lastUsedKey = `${source.key}:${lastUsedOption.format}`

                        return (
                          <ButtonGroup
                            fullWidth
                            isDisabled={
                              exportingKey !== null || source.count === 0
                            }
                          >
                            <Button
                              className="flex-1"
                              isPending={exportingKey === lastUsedKey}
                              onPress={() =>
                                handleExportDanmaku(lastUsedOption, source)
                              }
                            >
                              导出 {lastUsedOption.label}
                            </Button>

                            <Dropdown>
                              <Button
                                isIconOnly
                                aria-label={`选择${source.label}导出格式`}
                                isDisabled={
                                  exportingKey !== null || source.count === 0
                                }
                              >
                                <ButtonGroup.Separator />
                                <ChevronDown />
                              </Button>
                              <Dropdown.Popover>
                                <Dropdown.Menu
                                  selectionMode="single"
                                  disallowEmptySelection
                                  selectedKeys={[lastUsedFormat]}
                                  onAction={(key) => {
                                    const selectedOption =
                                      DANMAKU_EXPORT_OPTIONS.find(
                                        (option) => option.format === key,
                                      )
                                    if (!selectedOption) return
                                    handleExportDanmaku(selectedOption, source)
                                  }}
                                >
                                  {DANMAKU_EXPORT_GROUPS.map((group) => (
                                    <Dropdown.Section
                                      key={`${source.key}-${group.key}`}
                                    >
                                      <Header>{group.label}</Header>
                                      {DANMAKU_EXPORT_OPTIONS.filter(
                                        (option) => option.group === group.key,
                                      ).map((option) => (
                                        <Dropdown.Item
                                          key={option.format}
                                          id={option.format}
                                          textValue={option.label}
                                        >
                                          <Label>{option.label}</Label>
                                          <Dropdown.ItemIndicator />
                                        </Dropdown.Item>
                                      ))}
                                    </Dropdown.Section>
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          </ButtonGroup>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                isDisabled={exportingKey !== null}
                onPress={() => setShowExportDialog(false)}
              >
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* FastCap Dialog */}
      <FastCapModal
        isOpen={showFastCapDialog}
        onOpenChange={(open) => {
          setShowFastCapDialog(open)
          if (!open) {
            setFastCapExportState({ status: 'idle', content: '' })
          }
        }}
        state={fastCapExportState.status}
        content={fastCapExportState.content}
      />

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
                  <Table.Column>AID</Table.Column>
                  <Table.Column>视频源状态</Table.Column>
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
