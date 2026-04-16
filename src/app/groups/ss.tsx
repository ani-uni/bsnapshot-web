import {
  Accordion,
  Button,
  Card,
  Chip,
  Label,
  Link,
  ListBox,
  Modal,
  NumberField,
  Separator,
  Spinner,
  Table,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link as RLink, useNavigate, useParams } from 'react-router'

import { apiBaseUrlAtom } from '@/atoms/api'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import EditableText from '@/components/EditableText'
import { TMDB_IMAGE_PREFIX } from '@/constants/tmdb'

import { buildSnFromBgmtvEpisode, formatSn, bgmtvEpisodeComparator } from './sn'

type SeasonDetail = {
  id: string
  title: string | null
  tmdb: string | null
  bgmtv: number | null
}

type EpisodeItem = {
  id: string
  title: string | null
  sn: number | null
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

type TMDBSeriesInfo = {
  tv: {
    series: {
      name?: string
      seasons?: Array<{
        season_number?: number
        name?: string
        overview?: string | null
        poster_path?: string | null
        episode_count?: number
      }>
    }
  }
}

type TMDBMovieInfo = {
  movie: {
    id: number
    title?: string
    poster_path?: string | null
    backdrop_path?: string | null
    overview?: string | null
  }
}

type TMDBSeasonData = {
  isMovie: boolean
  title?: string
  overview?: string | null
  posterPath?: string | null
  seasonNumber?: number
  seasonName?: string
  episodeCount?: number
}

type TMDBEpisode = {
  id: number
  episode_number: number
  name?: string
  overview?: string | null
  still_path?: string | null
}

type BgmTvSubjectInfo = {
  id: number
  name: string
  name_cn?: string
  summary?: string
  images?: {
    large?: string
    common?: string
    medium?: string
    small?: string
    grid?: string
  }
}

type BgmTvSubjectResponse = {
  v0: {
    subjects: {
      '{subject_id}': BgmTvSubjectInfo
    }
  }
}

type BgmTvEpisode = {
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
  duration_seconds?: number
}

type BgmTvEpisodeResponse = {
  v0: {
    episodes: {
      total: number
      limit: number
      offset: number
      data: BgmTvEpisode[]
    }
  }
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

function toTmdbImageUrl(path?: string | null) {
  if (!path) return null
  return new URL(`w300${path}`, TMDB_IMAGE_PREFIX).toString()
}

export default function SeasonDetailPage() {
  const { ssid } = useParams<{ ssid: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)

  const [season, setSeason] = useState<SeasonDetail | null>(null)
  const [episodeList, setEpisodeList] = useState<EpisodeItem[]>([])
  const [captureList, setCaptureList] = useState<CaptureItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // TMDB states
  const [showTmdbModal, setShowTmdbModal] = useState(false)
  const [tmdbInfo, setTmdbInfo] = useState<TMDBSeasonData | null>(null)
  const [isLoadingTmdb, setIsLoadingTmdb] = useState(false)
  const [tmdbEpisodes, setTmdbEpisodes] = useState<TMDBEpisode[]>([])
  const [selectedTmdbEpisodeKeys, setSelectedTmdbEpisodeKeys] = useState<
    Set<string | number>
  >(new Set())
  const [isCreatingFromTmdb, setIsCreatingFromTmdb] = useState(false)
  const [isLoadingTmdbEpisodes, setIsLoadingTmdbEpisodes] = useState(false)

  // BgmTV states
  const [showBgmtvModal, setShowBgmtvModal] = useState(false)
  const [bgmtvInfo, setBgmtvInfo] = useState<BgmTvSubjectInfo | null>(null)
  const [isLoadingBgmtv, setIsLoadingBgmtv] = useState(false)
  const [bgmtvEpisodes, setBgmtvEpisodes] = useState<BgmTvEpisode[]>([])
  const [selectedBgmtvEpisodeKeys, setSelectedBgmtvEpisodeKeys] = useState<
    Set<string | number>
  >(new Set())
  const [isCreatingFromBgmtv, setIsCreatingFromBgmtv] = useState(false)
  const [isLoadingBgmtvEpisodes, setIsLoadingBgmtvEpisodes] = useState(false)

  // Manual creation states
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualSn, setManualSn] = useState<number>(1)
  const [isCreatingManual, setIsCreatingManual] = useState(false)

  const fetchSeasonDetail = useCallback(async () => {
    if (!ssid) return
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${ssid}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as SeasonDetail
      setSeason(data)
      setBreadcrumbs([
        { label: '合集', href: '/groups' },
        { label: displayTitle(data.title) },
      ])

      // Fetch associated captures
      const capturesRes = await fetch(
        `${apiBaseUrl}/api/seasons/${ssid}/captures`,
      )
      if (capturesRes.ok) {
        const capturesData = (await capturesRes.json()) as CaptureItem[]
        setCaptureList(capturesData)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, ssid, setBreadcrumbs])

  const fetchEpisodeList = useCallback(async () => {
    if (!ssid) return
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${ssid}/episodes`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as EpisodeItem[]
      setEpisodeList(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载剧集列表失败：${errorMsg}`)
    }
  }, [apiBaseUrl, ssid])

  const handleDeleteSeason = async () => {
    if (!ssid) return
    setIsDeleting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${ssid}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      toast.success('删除成功')
      navigate('/groups')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSaveTitle = async (newTitle: string) => {
    if (!ssid || !season) return
    const title = newTitle.trim()
    if (!title) {
      toast.warning('标题不能为空')
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${ssid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const updated = (await response.json()) as SeasonDetail
      setSeason(updated)
      setBreadcrumbs([
        { label: '合集', href: '/groups' },
        { label: displayTitle(updated.title) },
      ])
      toast.success('标题已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新失败：${errorMsg}`)
    }
  }

  const handleCreateEpisode = async (
    sn: number,
  ): Promise<EpisodeItem | undefined> => {
    if (!ssid) return
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/${ssid}/episodes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sn }),
        },
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return (await response.json()) as EpisodeItem
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`第 ${sn} 集创建失败：${errorMsg}`)
    }
  }

  const handleCreateMovieEpisode = async () => {
    if (!ssid) return
    try {
      const episode = await handleCreateEpisode(1)
      if (!episode) return
      const response = await fetch(`${apiBaseUrl}/api/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '正片' }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      toast.success('已创建正片')
      void fetchEpisodeList()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`创建失败：${errorMsg}`)
    }
  }

  const handlePatchEpisodeTitle = async (
    episodeId: string,
    sn: number,
    title?: string,
    ref?: { src: 'tmdb'; urlc: string } | { src: 'bgmtv'; episode_id: number },
  ) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ref }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`第 ${sn} 集标题更新失败：${errorMsg}`)
    }
  }

  // TMDB functions
  const loadTmdbInfo = useCallback(async () => {
    if (!season?.tmdb) return

    setIsLoadingTmdb(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/tmdb/info?urlc=${encodeURIComponent(season.tmdb)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // 检查是电影还是电视剧
      const isMovie = season.tmdb.startsWith('movie/')

      if (isMovie) {
        // 处理电影数据
        const data = (await response.json()) as TMDBMovieInfo
        setTmdbInfo({
          isMovie: true,
          title: data.movie.title,
          overview: data.movie.overview,
          posterPath: data.movie.poster_path ?? data.movie.backdrop_path,
        })
      } else {
        // 处理电视剧数据
        const data = (await response.json()) as TMDBSeriesInfo

        // 从urlc中提取season_number (格式: tv/{series_id}/season/{season_number})
        const match = season.tmdb.match(/\/season\/(\d+)/)
        const seasonNumber = match ? Number.parseInt(match[1], 10) : undefined

        // 从seasons数组中找到匹配的season
        const matchedSeason =
          seasonNumber !== undefined
            ? data.tv.series.seasons?.find(
                (s) => s.season_number === seasonNumber,
              )
            : undefined

        setTmdbInfo({
          isMovie: false,
          title: data.tv.series.name,
          overview: matchedSeason?.overview,
          posterPath: matchedSeason?.poster_path,
          seasonNumber: matchedSeason?.season_number,
          seasonName: matchedSeason?.name,
          episodeCount: matchedSeason?.episode_count,
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载TMDB信息失败：${errorMsg}`)
    } finally {
      setIsLoadingTmdb(false)
    }
  }, [apiBaseUrl, season])

  const loadTmdbEpisodes = useCallback(async () => {
    if (!season?.tmdb) return

    setIsLoadingTmdbEpisodes(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/tmdb/eps?urlc=${encodeURIComponent(season.tmdb)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as TMDBEpisode[]
      setTmdbEpisodes(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载TMDB剧集失败：${errorMsg}`)
    } finally {
      setIsLoadingTmdbEpisodes(false)
    }
  }, [apiBaseUrl, season])

  const handleOpenTmdbModal = () => {
    setShowTmdbModal(true)
    void loadTmdbEpisodes()
  }

  const handleCreateFromTmdb = async () => {
    if (selectedTmdbEpisodeKeys.size === 0) {
      toast.warning('请选择至少一集')
      return
    }

    setIsCreatingFromTmdb(true)
    try {
      for (const key of selectedTmdbEpisodeKeys) {
        const episodeNumber = Number(key)
        const episode = await handleCreateEpisode(episodeNumber)
        if (!episode) continue
        const tmdbEpisode = tmdbEpisodes.find(
          (ep) => ep.episode_number === episodeNumber,
        )
        if (tmdbEpisode?.name && season?.tmdb) {
          await handlePatchEpisodeTitle(
            episode.id,
            episodeNumber,
            tmdbEpisode.name,
            {
              src: 'tmdb',
              urlc: `${season.tmdb}/episode/${episodeNumber}`,
            },
          )
        }
      }
      void fetchEpisodeList()
      toast.success('批量创建成功')
      setShowTmdbModal(false)
      setSelectedTmdbEpisodeKeys(new Set())
    } finally {
      setIsCreatingFromTmdb(false)
    }
  }

  // BgmTV functions
  const loadBgmtvInfo = useCallback(async () => {
    if (!season?.bgmtv) return

    setIsLoadingBgmtv(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/bgmtv/info?subject_id=${season.bgmtv}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as BgmTvSubjectResponse
      setBgmtvInfo(data.v0.subjects['{subject_id}'])
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载BgmTV信息失败：${errorMsg}`)
    } finally {
      setIsLoadingBgmtv(false)
    }
  }, [apiBaseUrl, season])

  const loadBgmtvEpisodes = useCallback(async () => {
    if (!season?.bgmtv) return

    setIsLoadingBgmtvEpisodes(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/bgmtv/eps?subject_id=${season.bgmtv}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as BgmTvEpisodeResponse
      setBgmtvEpisodes(data.v0.episodes.data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载BgmTV剧集失败：${errorMsg}`)
    } finally {
      setIsLoadingBgmtvEpisodes(false)
    }
  }, [apiBaseUrl, season])

  const handleOpenBgmtvModal = () => {
    setShowBgmtvModal(true)
    void loadBgmtvEpisodes()
  }

  const handleCreateFromBgmtv = async () => {
    if (selectedBgmtvEpisodeKeys.size === 0) {
      toast.warning('请选择至少一集')
      return
    }

    setIsCreatingFromBgmtv(true)
    try {
      for (const episodeId of selectedBgmtvEpisodeKeys) {
        // 按 episodeId 找到对应的 BGMTV 剧集
        const bgmtvEpisode = bgmtvEpisodes.find((ep) => ep.id === episodeId)
        if (!bgmtvEpisode) {
          toast.warning(`未找到 BGMTV 剧集 ${episodeId}`)
          continue
        }

        // 计算 sn
        const sn = buildSnFromBgmtvEpisode(bgmtvEpisode)
        if (sn === null) {
          toast.warning(
            `无法为 ${bgmtvEpisode.name_cn || bgmtvEpisode.name} 计算集数（ep 字段缺失）`,
          )
          continue
        }

        // 创建剧集
        const createdEpisode = await handleCreateEpisode(sn)
        if (!createdEpisode) continue

        // 绑定 BGMTV 参考
        const title = bgmtvEpisode.name_cn || bgmtvEpisode.name
        await handlePatchEpisodeTitle(createdEpisode.id, sn, title, {
          src: 'bgmtv',
          episode_id: bgmtvEpisode.id,
        })
      }
      void fetchEpisodeList()
      toast.success('批量创建成功')
      setShowBgmtvModal(false)
      setSelectedBgmtvEpisodeKeys(new Set())
    } finally {
      setIsCreatingFromBgmtv(false)
    }
  }

  const handleCreateManual = async () => {
    setIsCreatingManual(true)
    try {
      await handleCreateEpisode(manualSn)
      void fetchEpisodeList()
      toast.success(`第 ${manualSn} 集创建成功`)
      setShowManualModal(false)
      setManualSn(1)
    } finally {
      setIsCreatingManual(false)
    }
  }

  useEffect(() => {
    void fetchSeasonDetail()
    void fetchEpisodeList()
  }, [fetchSeasonDetail, fetchEpisodeList])

  useEffect(() => {
    if (season?.tmdb) {
      void loadTmdbInfo()
    } else if (season?.bgmtv) {
      void loadBgmtvInfo()
    }
  }, [season, loadTmdbInfo, loadBgmtvInfo])

  if (!ssid) {
    return <div>无效的 Season ID</div>
  }

  const existingSnSet = new Set(
    episodeList.flatMap((e) => (e.sn !== null ? [e.sn] : [])),
  )
  const availableTmdbEpisodes = tmdbEpisodes.filter(
    (ep) => !existingSnSet.has(ep.episode_number),
  )
  // BGMTV 去重：按计算后的 sn 进行，而不是 sort
  const availableBgmtvEpisodes = bgmtvEpisodes
    .toSorted(bgmtvEpisodeComparator)
    .filter((ep) => {
      const calculatedSn = buildSnFromBgmtvEpisode(ep)
      // 若 sn 无法计算，过滤掉；若已存在，也过滤掉
      return calculatedSn !== null && !existingSnSet.has(calculatedSn)
    })

  return (
    <div className="space-y-4">
      {/* Basic Info Card */}
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
                <div className="mb-2 text-sm text-muted">Season ID</div>
                <div className="font-mono text-sm">{season?.id || '-'}</div>
              </div>

              <div>
                <div className="mb-2 text-sm text-muted">标题</div>
                <EditableText
                  value={season?.title ?? null}
                  onSave={handleSaveTitle}
                  placeholder="输入季度名称"
                  isDisabled={season?.tmdb != null || season?.bgmtv != null}
                />
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

      {/* TMDB Card */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>TMDB</Card.Title>
          <div className="flex gap-2">
            <div className="font-mono text-xs text-muted break-all">
              {season?.tmdb || '-'}
            </div>
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          {!season?.tmdb ? (
            <p className="text-muted">暂无 TMDB 引用</p>
          ) : isLoadingTmdb ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : tmdbInfo ? (
            <div className="flex gap-4">
              {tmdbInfo.posterPath && (
                <div className="shrink-0">
                  <img
                    src={toTmdbImageUrl(tmdbInfo.posterPath) || ''}
                    alt={tmdbInfo.title}
                    className="h-auto w-36 rounded"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                {tmdbInfo.title && (
                  <div className="text-lg font-semibold">{tmdbInfo.title}</div>
                )}
                {!tmdbInfo.isMovie && (
                  <div className="flex gap-2 text-sm text-muted">
                    {tmdbInfo.seasonName && <div>{tmdbInfo.seasonName}</div>}
                    {tmdbInfo.seasonNumber != null && (
                      <div>第 {tmdbInfo.seasonNumber} 季</div>
                    )}
                    {tmdbInfo.episodeCount != null && (
                      <div>共 {tmdbInfo.episodeCount} 集</div>
                    )}
                  </div>
                )}
                {tmdbInfo.isMovie && (
                  <div className="text-sm text-muted">电影</div>
                )}
                {tmdbInfo.overview && (
                  <div className="text-sm text-fg/70">{tmdbInfo.overview}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted">暂无TMDB信息</p>
          )}
        </Card.Content>
      </Card>

      {/* BgmTV Card */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>BgmTV</Card.Title>
          <div className="font-mono text-xs text-muted break-all">
            {season?.bgmtv ?? '-'}
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          {!season?.bgmtv ? (
            <p className="text-muted">暂无 BgmTV 引用</p>
          ) : isLoadingBgmtv ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : bgmtvInfo ? (
            <div className="flex gap-4">
              {bgmtvInfo.images?.large && (
                <div className="shrink-0">
                  <img
                    src={bgmtvInfo.images.large}
                    alt={bgmtvInfo.name}
                    className="h-auto w-36 rounded"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="text-lg font-semibold">
                  {bgmtvInfo.name_cn || bgmtvInfo.name}
                </div>
                {bgmtvInfo.name_cn && bgmtvInfo.name !== bgmtvInfo.name_cn && (
                  <div className="text-sm text-fg/60">{bgmtvInfo.name}</div>
                )}
                {bgmtvInfo.summary && (
                  <div className="text-sm text-fg/70">{bgmtvInfo.summary}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted">暂无BgmTV信息</p>
          )}
        </Card.Content>
      </Card>

      {/* Episodes Card */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>剧集列表</Card.Title>
          <div className="flex justify-end gap-2">
            {season?.tmdb && !tmdbInfo?.isMovie && (
              <Button onPress={handleOpenTmdbModal}>从TMDB创建</Button>
            )}
            {season?.bgmtv && (
              <Button onPress={handleOpenBgmtvModal}>从BgmTV创建</Button>
            )}
            {season?.tmdb && tmdbInfo?.isMovie && episodeList.length === 0 && (
              <Button onPress={handleCreateMovieEpisode}>新建</Button>
            )}
            {!season?.tmdb && !season?.bgmtv && (
              <Button onPress={() => setShowManualModal(true)}>新建</Button>
            )}
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          {episodeList.length === 0 ? (
            <p className="text-muted">暂无剧集</p>
          ) : (
            <Accordion>
              {episodeList.map((episode) => (
                <Accordion.Item key={episode.id} id={episode.id}>
                  <Accordion.Heading>
                    <Accordion.Trigger
                      onPress={() => navigate(`/groups/ep/${episode.id}`)}
                    >
                      {formatSn(episode.sn)}
                      {formatSn(episode.sn) && ' - '}
                      {displayTitle(episode.title)}
                      <Accordion.Indicator>
                        <ChevronRight />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Content>
      </Card>

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

      {/* Delete Confirmation Dialog */}
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
              <p>确定要删除这个 Season 吗？此操作无法撤销。</p>
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
                onPress={() => void handleDeleteSeason()}
              >
                删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* TMDB Episode Selection Modal */}
      <Modal.Backdrop isOpen={showTmdbModal} onOpenChange={setShowTmdbModal}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-160">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>从TMDB创建剧集</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3">
                {isLoadingTmdbEpisodes ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : availableTmdbEpisodes.length === 0 ? (
                  <p className="text-muted">暂无可用剧集</p>
                ) : (
                  <div className="max-h-90 overflow-auto rounded border border-border">
                    <ListBox
                      selectionMode="multiple"
                      selectedKeys={selectedTmdbEpisodeKeys}
                      onSelectionChange={(keys) => {
                        if (keys === 'all') {
                          setSelectedTmdbEpisodeKeys(
                            new Set(
                              availableTmdbEpisodes.map(
                                (ep) => ep.episode_number,
                              ),
                            ),
                          )
                        } else {
                          setSelectedTmdbEpisodeKeys(
                            new Set(keys as Iterable<string | number>),
                          )
                        }
                      }}
                    >
                      {availableTmdbEpisodes.map((episode) => {
                        const imageUrl = toTmdbImageUrl(episode.still_path)
                        return (
                          <ListBox.Item
                            key={episode.episode_number}
                            id={episode.episode_number}
                            textValue={
                              episode.name || `第 ${episode.episode_number} 集`
                            }
                          >
                            <div className="flex gap-3 w-full">
                              {imageUrl && (
                                <div className="shrink-0">
                                  <img
                                    src={imageUrl}
                                    alt={episode.name}
                                    className="h-auto w-20 rounded"
                                  />
                                </div>
                              )}
                              <div className="flex flex-1 flex-col gap-1">
                                <div className="text-sm font-medium">
                                  第 {episode.episode_number} 集 -{' '}
                                  {episode.name}
                                </div>
                                {episode.overview && (
                                  <div className="line-clamp-2 text-xs text-fg/70">
                                    {episode.overview}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )
                      })}
                    </ListBox>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                isDisabled={isCreatingFromTmdb}
                onPress={() => {
                  setShowTmdbModal(false)
                  setSelectedTmdbEpisodeKeys(new Set())
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isCreatingFromTmdb}
                isDisabled={selectedTmdbEpisodeKeys.size === 0}
                onPress={() => void handleCreateFromTmdb()}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* BgmTV Episode Selection Modal */}
      <Modal.Backdrop isOpen={showBgmtvModal} onOpenChange={setShowBgmtvModal}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-160">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>从BgmTV创建剧集</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3">
                {isLoadingBgmtvEpisodes ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : availableBgmtvEpisodes.length === 0 ? (
                  <p className="text-muted">暂无可用剧集</p>
                ) : (
                  <div className="max-h-90 overflow-auto rounded border border-border">
                    <ListBox
                      selectionMode="multiple"
                      selectedKeys={selectedBgmtvEpisodeKeys}
                      onSelectionChange={(keys) => {
                        if (keys === 'all') {
                          setSelectedBgmtvEpisodeKeys(
                            new Set(availableBgmtvEpisodes.map((ep) => ep.id)),
                          )
                        } else {
                          setSelectedBgmtvEpisodeKeys(
                            new Set(keys as Iterable<string | number>),
                          )
                        }
                      }}
                    >
                      {availableBgmtvEpisodes.map((episode) => {
                        const calculatedSn = buildSnFromBgmtvEpisode(episode)
                        const snDisplay =
                          calculatedSn !== null
                            ? formatSn(calculatedSn, episode.type)
                            : '无数据'
                        return (
                          <ListBox.Item
                            key={episode.id}
                            id={episode.id}
                            textValue={`${snDisplay} ${episode.name_cn || episode.name}`}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-medium">
                                {snDisplay} - {episode.name_cn || episode.name}
                              </div>
                              {episode.name_cn &&
                                episode.name !== episode.name_cn && (
                                  <div className="text-xs text-fg/60">
                                    {episode.name}
                                  </div>
                                )}
                              {episode.desc && (
                                <div className="line-clamp-2 text-xs text-fg/70">
                                  {episode.desc}
                                </div>
                              )}
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )
                      })}
                    </ListBox>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                isDisabled={isCreatingFromBgmtv}
                onPress={() => {
                  setShowBgmtvModal(false)
                  setSelectedBgmtvEpisodeKeys(new Set())
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isCreatingFromBgmtv}
                isDisabled={selectedBgmtvEpisodeKeys.size === 0}
                onPress={() => void handleCreateFromBgmtv()}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Manual Episode Creation Modal */}
      <Modal.Backdrop
        isOpen={showManualModal}
        onOpenChange={setShowManualModal}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>创建剧集</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-4">
                <NumberField
                  value={manualSn}
                  onChange={setManualSn}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingManual && manualSn) {
                      void handleCreateManual()
                    }
                  }}
                  className="w-full max-w-64"
                >
                  <Label>集数</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                isDisabled={isCreatingManual}
                onPress={() => {
                  setShowManualModal(false)
                  setManualSn(1)
                }}
              >
                取消
              </Button>
              <Button
                isPending={isCreatingManual}
                isDisabled={Number.isNaN(manualSn)}
                onPress={() => void handleCreateManual()}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
