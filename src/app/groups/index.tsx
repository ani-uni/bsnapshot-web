import {
  Accordion,
  Button,
  Card,
  ListBox,
  Modal,
  SearchField,
  Separator,
  Spinner,
  toast,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronRight, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiBaseUrlAtom } from '@/atoms/api'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import { TMDB_IMAGE_PREFIX } from '@/constants/tmdb'

type SeriesItem = {
  season_id?: string
  id?: string
  title: string | null
}

type TMDBSeason = {
  season_number: number
  name: string
  id: number
  poster_path?: string | null
  overview?: string | null
}

type TMDBSeries = {
  id: number
  name: string
  seasons?: TMDBSeason[]
}

type TMDBSearchResult = {
  id: number
  name?: string
  title?: string
  media_type?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string | null
}

type TMDBFlattenedSeason = {
  series_id: number
  series_name: string
  season_number: number | null
  season_name: string
  urlc: string
  image_path?: string | null
  summary?: string | null
}

type BgmTvSearchResultItem = {
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

function getSSID(item: SeriesItem) {
  return item.season_id ?? item.id ?? ''
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

function parseTmdbSeriesIdFromUrlc(input: string) {
  const match = input.trim().match(/tv\/(\d+)/)
  if (!match?.[1]) return null
  const seriesId = Number.parseInt(match[1], 10)
  return Number.isFinite(seriesId) ? seriesId : null
}

function toTmdbImageUrl(path?: string | null) {
  if (!path) return null
  return new URL(`w300${path}`, TMDB_IMAGE_PREFIX).toString()
}

export default function GroupsIndexPage() {
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)
  const [seasonList, setSeasonList] = useState<SeriesItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Default episodes states
  const [defaultEpisodes, setDefaultEpisodes] = useState<
    Array<{ id: string; title: string | null }>
  >([])
  const [isLoadingDefaultEpisodes, setIsLoadingDefaultEpisodes] =
    useState(false)
  const [isCreatingDefaultEpisode, setIsCreatingDefaultEpisode] =
    useState(false)

  // TMDB states
  const [showTmdbModal, setShowTmdbModal] = useState(false)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbSearchResults, setTmdbSearchResults] = useState<
    TMDBFlattenedSeason[]
  >([])
  const [selectedTmdbSeasons, setSelectedTmdbSeasons] = useState<
    Set<string | number>
  >(new Set())
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false)
  const [isCreatingFromTmdb, setIsCreatingFromTmdb] = useState(false)
  const [hasSearchedTmdb, setHasSearchedTmdb] = useState(false)

  // BgmTV states
  const [showBgmtvModal, setShowBgmtvModal] = useState(false)
  const [bgmtvQuery, setBgmtvQuery] = useState('')
  const [bgmtvSearchResults, setBgmtvSearchResults] = useState<
    BgmTvSearchResultItem[]
  >([])
  const [selectedBgmtvSubjects, setSelectedBgmtvSubjects] = useState<
    Set<string | number>
  >(new Set())
  const [isSearchingBgmtv, setIsSearchingBgmtv] = useState(false)
  const [isCreatingFromBgmtv, setIsCreatingFromBgmtv] = useState(false)
  const [hasSearchedBgmtv, setHasSearchedBgmtv] = useState(false)

  const fetchSeasonList = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as SeriesItem[]
      setSeasonList(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载列表失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  const fetchDefaultEpisodes = useCallback(async () => {
    setIsLoadingDefaultEpisodes(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/default/episodes`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as Array<{
        id: string
        title: string | null
      }>
      setDefaultEpisodes(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载无所属剧集失败：${errorMsg}`)
    } finally {
      setIsLoadingDefaultEpisodes(false)
    }
  }, [apiBaseUrl])

  const handleCreateSeason = async () => {
    setIsCreating(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const newSeason = (await response.json()) as SeriesItem
      const ssid = getSSID(newSeason)
      if (!ssid) {
        throw new Error('缺少season_id')
      }
      toast.success('新建成功')
      setSeasonList((prev) => [...prev, newSeason])
      navigate(`/groups/ss/${ssid}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`新建失败：${errorMsg}`)
    } finally {
      setIsCreating(false)
    }
  }

  // TMDB handlers
  const handleSearchTmdb = async () => {
    const query = tmdbQuery.trim()
    if (!query) {
      toast.warning('请输入搜索关键词')
      return
    }

    setIsSearchingTmdb(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/tmdb/search?query=${encodeURIComponent(query)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as Record<string, unknown>
      const flattened: TMDBFlattenedSeason[] = []

      const pushSeriesSeasons = (series: TMDBSeries) => {
        if (!series.seasons?.length) return
        series.seasons.forEach((season) => {
          flattened.push({
            series_id: series.id,
            series_name: series.name,
            season_number: season.season_number,
            season_name: season.name,
            urlc: `tv/${series.id}/season/${season.season_number}`,
            image_path: season.poster_path ?? null,
            summary: season.overview ?? null,
          })
        })
      }

      if ('tv' in data && typeof data.tv === 'object' && data.tv !== null) {
        const tvData = data.tv as Record<string, unknown>
        if (
          'series' in tvData &&
          typeof tvData.series === 'object' &&
          tvData.series !== null
        ) {
          pushSeriesSeasons(tvData.series as TMDBSeries)
        } else if (
          'season' in tvData &&
          typeof tvData.season === 'object' &&
          tvData.season !== null
        ) {
          const parsedSeriesId = parseTmdbSeriesIdFromUrlc(query)
          if (parsedSeriesId) {
            const infoRes = await fetch(
              `${apiBaseUrl}/api/seasons/3rd/tmdb/info?urlc=${encodeURIComponent(`tv/${parsedSeriesId}/season/1`)}`,
            )
            if (infoRes.ok) {
              const infoData = (await infoRes.json()) as {
                tv?: { series?: TMDBSeries }
              }
              if (infoData.tv?.series) {
                pushSeriesSeasons(infoData.tv.series)
              }
            }
          }
        }
      } else if (
        'movie' in data &&
        typeof data.movie === 'object' &&
        data.movie !== null
      ) {
        const movie = data.movie as {
          id: number
          title?: string
          poster_path?: string | null
          backdrop_path?: string | null
          overview?: string | null
        }
        flattened.push({
          series_id: movie.id,
          series_name: movie.title || '未命名电影',
          season_number: null,
          season_name: '电影',
          urlc: `movie/${movie.id}`,
          image_path: movie.poster_path ?? movie.backdrop_path ?? null,
          summary: movie.overview ?? null,
        })
      } else if (
        'search' in data &&
        typeof data.search === 'object' &&
        data.search !== null
      ) {
        const searchData = data.search as Record<string, unknown>
        if (
          'multi' in searchData &&
          typeof searchData.multi === 'object' &&
          searchData.multi !== null
        ) {
          const multiData = searchData.multi as { results?: TMDBSearchResult[] }
          const searchResults = multiData.results || []

          for (const result of searchResults) {
            if (result.media_type === 'movie') {
              flattened.push({
                series_id: result.id,
                series_name: result.title || '未命名电影',
                season_number: null,
                season_name: '电影',
                urlc: `movie/${result.id}`,
                image_path: result.poster_path ?? result.backdrop_path ?? null,
                summary: result.overview ?? null,
              })
              continue
            }

            if (result.media_type === 'tv') {
              try {
                const infoRes = await fetch(
                  `${apiBaseUrl}/api/seasons/3rd/tmdb/info?urlc=${encodeURIComponent(`tv/${result.id}/season/1`)}`,
                )
                if (!infoRes.ok) continue
                const infoData = (await infoRes.json()) as {
                  tv?: { series?: TMDBSeries }
                }
                const series = infoData.tv?.series
                if (series) {
                  pushSeriesSeasons(series)
                }
              } catch {
                // ignore single item failure
              }
            }
          }
        }
      }

      setTmdbSearchResults(flattened)
      setHasSearchedTmdb(true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`搜索失败：${errorMsg}`)
    } finally {
      setIsSearchingTmdb(false)
    }
  }

  const handleCreateFromTmdb = async () => {
    if (selectedTmdbSeasons.size === 0) {
      toast.warning('请选择至少一个季度')
      return
    }

    setIsCreatingFromTmdb(true)
    try {
      for (const key of selectedTmdbSeasons) {
        const seasonKey = String(key)
        const selected = tmdbSearchResults.find(
          (s) => `${s.series_id}-${s.season_number}` === seasonKey,
        )
        if (!selected) continue

        // Create season
        const createRes = await fetch(`${apiBaseUrl}/api/seasons`, {
          method: 'POST',
        })
        if (!createRes.ok) {
          throw new Error(`创建失败：HTTP ${createRes.status}`)
        }
        const newSeason = (await createRes.json()) as SeriesItem
        const ssid = getSSID(newSeason)
        if (!ssid) {
          throw new Error('缺少season_id')
        }

        // Update season with title and ref
        const updateRes = await fetch(`${apiBaseUrl}/api/seasons/${ssid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:
              selected.season_number === null
                ? selected.series_name
                : `${selected.series_name} ${selected.season_name}`,
            ref: {
              src: 'tmdb',
              urlc: selected.urlc,
            },
          }),
        })
        if (!updateRes.ok) {
          throw new Error(`更新失败：HTTP ${updateRes.status}`)
        }
      }

      toast.success('创建成功')
      setShowTmdbModal(false)
      setTmdbQuery('')
      setTmdbSearchResults([])
      setSelectedTmdbSeasons(new Set())
      setHasSearchedTmdb(false)
      void fetchSeasonList()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`${errorMsg}`)
    } finally {
      setIsCreatingFromTmdb(false)
    }
  }

  // BgmTV handlers
  const handleSearchBgmtv = async () => {
    const query = bgmtvQuery.trim()
    if (!query) {
      toast.warning('请输入搜索关键词或ID')
      return
    }

    setIsSearchingBgmtv(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/3rd/bgmtv/search?query=${encodeURIComponent(query)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = (await response.json()) as Record<string, unknown>
      let results: BgmTvSearchResultItem[] = []

      // Check if it's a single subject result (ID search)
      if ('v0' in data && typeof data.v0 === 'object' && data.v0 !== null) {
        const v0 = data.v0 as Record<string, unknown>

        if (
          'subjects' in v0 &&
          typeof v0.subjects === 'object' &&
          v0.subjects !== null
        ) {
          const subjects = v0.subjects as Record<string, unknown>
          const subjectData = subjects['{subject_id}']
          if (subjectData && typeof subjectData === 'object') {
            results = [subjectData as BgmTvSearchResultItem]
          }
        } else if (
          'search' in v0 &&
          typeof v0.search === 'object' &&
          v0.search !== null
        ) {
          const search = v0.search as Record<string, unknown>
          if (
            'subjects' in search &&
            typeof search.subjects === 'object' &&
            search.subjects !== null
          ) {
            const subjects = search.subjects as Record<string, unknown>
            const postData = subjects['<post>']
            if (
              postData &&
              typeof postData === 'object' &&
              'data' in postData
            ) {
              const pagedData = postData as { data?: BgmTvSearchResultItem[] }
              results = pagedData.data || []
            }
          }
        }
      }

      setBgmtvSearchResults(results)
      setHasSearchedBgmtv(true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`搜索失败：${errorMsg}`)
    } finally {
      setIsSearchingBgmtv(false)
    }
  }

  const handleCreateDefaultEpisode = async () => {
    setIsCreatingDefaultEpisode(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/seasons/default/episodes`,
        {
          method: 'POST',
        },
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      toast.success('创建成功')
      void fetchDefaultEpisodes()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`创建失败：${errorMsg}`)
    } finally {
      setIsCreatingDefaultEpisode(false)
    }
  }

  const handleCreateFromBgmtv = async () => {
    if (selectedBgmtvSubjects.size === 0) {
      toast.warning('请选择至少一个番剧')
      return
    }

    setIsCreatingFromBgmtv(true)
    try {
      for (const key of selectedBgmtvSubjects) {
        const subjectId = Number.parseInt(String(key), 10)
        const selected = bgmtvSearchResults.find((s) => s.id === subjectId)
        if (!selected) continue

        // Create season
        const createRes = await fetch(`${apiBaseUrl}/api/seasons`, {
          method: 'POST',
        })
        if (!createRes.ok) {
          throw new Error(`创建失败：HTTP ${createRes.status}`)
        }
        const newSeason = (await createRes.json()) as SeriesItem
        const ssid = getSSID(newSeason)
        if (!ssid) {
          throw new Error('缺少season_id')
        }

        // Update season with title and ref
        const updateRes = await fetch(`${apiBaseUrl}/api/seasons/${ssid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selected.name_cn || selected.name,
            ref: {
              src: 'bgmtv',
              subject_id: selected.id,
            },
          }),
        })
        if (!updateRes.ok) {
          throw new Error(`更新失败：HTTP ${updateRes.status}`)
        }
      }

      toast.success('创建成功')
      setShowBgmtvModal(false)
      setBgmtvQuery('')
      setBgmtvSearchResults([])
      setSelectedBgmtvSubjects(new Set())
      setHasSearchedBgmtv(false)
      void fetchSeasonList()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`${errorMsg}`)
    } finally {
      setIsCreatingFromBgmtv(false)
    }
  }

  useEffect(() => {
    setBreadcrumbs([{ label: '合集' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    void fetchSeasonList()
    void fetchDefaultEpisodes()
  }, [fetchSeasonList, fetchDefaultEpisodes])

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Card.Header>
          <Card.Title>番剧 / 电影</Card.Title>
          <div className="flex justify-end gap-2">
            <Button onPress={() => setShowTmdbModal(true)}>从TMDB创建</Button>
            <Button onPress={() => setShowBgmtvModal(true)}>从BgmTV创建</Button>
            <Button isPending={isCreating} onPress={handleCreateSeason}>
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  <Plus />
                  新建
                </>
              )}
            </Button>
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner color="current" />
            </div>
          ) : seasonList.length === 0 ? (
            <p className="text-muted">暂无</p>
          ) : (
            <Accordion>
              {seasonList.map((season) => {
                const ssid = getSSID(season)
                if (!ssid) {
                  return null
                }
                return (
                  <Accordion.Item key={ssid} id={ssid}>
                    <Accordion.Heading>
                      <Accordion.Trigger
                        onPress={() => navigate(`/groups/ss/${ssid}`)}
                      >
                        {displayTitle(season.title)}
                        <Accordion.Indicator>
                          <ChevronRight />
                        </Accordion.Indicator>
                      </Accordion.Trigger>
                    </Accordion.Heading>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          )}
        </Card.Content>
      </Card>

      {/* Default Episodes Card */}
      <Card className="p-6">
        <Card.Header>
          <Card.Title>视频 / 无所属剧集</Card.Title>
          <div className="flex justify-end">
            <Button
              isPending={isCreatingDefaultEpisode}
              onPress={handleCreateDefaultEpisode}
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  <Plus />
                  新建
                </>
              )}
            </Button>
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          {isLoadingDefaultEpisodes ? (
            <div className="flex justify-center py-8">
              <Spinner color="current" />
            </div>
          ) : defaultEpisodes.length === 0 ? (
            <p className="text-muted">暂无</p>
          ) : (
            <Accordion>
              {defaultEpisodes.map((episode) => (
                <Accordion.Item key={episode.id} id={episode.id}>
                  <Accordion.Heading>
                    <Accordion.Trigger
                      onPress={() => navigate(`/groups/ep/${episode.id}`)}
                    >
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

      {/* TMDB Modal */}
      <Modal.Backdrop isOpen={showTmdbModal} onOpenChange={setShowTmdbModal}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-160">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>从TMDB创建</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3">
                <div className="text-sm text-muted">搜索电视剧或电影</div>
                <div className="flex gap-2">
                  <SearchField
                    name="tmdb-search"
                    variant="secondary"
                    className="flex-1"
                    value={tmdbQuery}
                    onChange={setTmdbQuery}
                    isDisabled={isSearchingTmdb || isCreatingFromTmdb}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !isSearchingTmdb &&
                        !isCreatingFromTmdb
                      ) {
                        void handleSearchTmdb()
                      }
                    }}
                  >
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="如: Attack on Titan" />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <Button
                    isPending={isSearchingTmdb}
                    isDisabled={isCreatingFromTmdb}
                    onPress={() => void handleSearchTmdb()}
                  >
                    搜索
                  </Button>
                </div>

                {hasSearchedTmdb && (
                  <div className="max-h-90 overflow-auto rounded border border-border">
                    <ListBox
                      selectionMode="multiple"
                      selectedKeys={selectedTmdbSeasons}
                      onSelectionChange={(keys) => {
                        if (keys === 'all') {
                          setSelectedTmdbSeasons(
                            new Set(
                              tmdbSearchResults.map(
                                (s) => `${s.series_id}-${s.season_number}`,
                              ),
                            ),
                          )
                        } else {
                          setSelectedTmdbSeasons(
                            new Set(keys as Iterable<string | number>),
                          )
                        }
                      }}
                    >
                      {tmdbSearchResults.map((season) => {
                        const key = `${season.series_id}-${season.season_number}`
                        const imageUrl = toTmdbImageUrl(season.image_path)
                        const isMovie = season.season_number === null
                        const displayText = isMovie
                          ? season.series_name
                          : `${season.series_name} ${season.season_name}`
                        return (
                          <ListBox.Item
                            key={key}
                            id={key}
                            textValue={displayText}
                          >
                            <div className="flex gap-3 w-full">
                              {imageUrl ? (
                                <div className="shrink-0">
                                  <img
                                    src={imageUrl}
                                    alt={displayText}
                                    className="h-auto w-14 rounded"
                                  />
                                </div>
                              ) : null}
                              <div className="flex flex-1 flex-col gap-1">
                                <div className="text-sm font-medium">
                                  {displayText}
                                </div>
                                <div className="font-mono text-xs text-fg/60">
                                  {isMovie
                                    ? '电影'
                                    : `第${season.season_number}季`}
                                </div>
                                {season.summary ? (
                                  <div className="line-clamp-2 text-xs text-fg/70">
                                    {season.summary}
                                  </div>
                                ) : null}
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
                isDisabled={isSearchingTmdb || isCreatingFromTmdb}
                onPress={() => {
                  setShowTmdbModal(false)
                  setTmdbQuery('')
                  setTmdbSearchResults([])
                  setSelectedTmdbSeasons(new Set())
                  setHasSearchedTmdb(false)
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isCreatingFromTmdb}
                isDisabled={selectedTmdbSeasons.size === 0 || isSearchingTmdb}
                onPress={() => void handleCreateFromTmdb()}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* BgmTV Modal */}
      <Modal.Backdrop isOpen={showBgmtvModal} onOpenChange={setShowBgmtvModal}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-160">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>从BgmTV创建</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-3">
                <div className="text-sm text-muted">
                  输入 BgmTV subject_id 或关键词
                </div>
                <div className="flex gap-2">
                  <SearchField
                    name="bgmtv-search"
                    variant="secondary"
                    className="flex-1"
                    value={bgmtvQuery}
                    onChange={setBgmtvQuery}
                    isDisabled={isSearchingBgmtv || isCreatingFromBgmtv}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !isSearchingBgmtv &&
                        !isCreatingFromBgmtv
                      ) {
                        void handleSearchBgmtv()
                      }
                    }}
                  >
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="如: 2808 或 进击的巨人" />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <Button
                    isPending={isSearchingBgmtv}
                    isDisabled={isCreatingFromBgmtv}
                    onPress={() => void handleSearchBgmtv()}
                  >
                    搜索
                  </Button>
                </div>

                {hasSearchedBgmtv && (
                  <div className="max-h-90 overflow-auto rounded border border-border">
                    <ListBox
                      selectionMode="multiple"
                      selectedKeys={selectedBgmtvSubjects}
                      onSelectionChange={(keys) => {
                        if (keys === 'all') {
                          setSelectedBgmtvSubjects(
                            new Set(
                              bgmtvSearchResults.map((s) => String(s.id)),
                            ),
                          )
                        } else {
                          setSelectedBgmtvSubjects(
                            new Set(keys as Iterable<string | number>),
                          )
                        }
                      }}
                    >
                      {bgmtvSearchResults.map((item) => (
                        <ListBox.Item
                          key={String(item.id)}
                          id={String(item.id)}
                          textValue={item.name}
                        >
                          <div className="flex gap-3 w-full">
                            {item.images?.large && (
                              <div className="shrink-0">
                                <img
                                  src={item.images.large}
                                  alt={item.name}
                                  className="h-auto w-14 rounded"
                                />
                              </div>
                            )}
                            <div className="flex flex-1 flex-col gap-1">
                              <div className="text-sm font-medium">
                                {item.name}
                              </div>
                              {item.name_cn && (
                                <div className="text-xs text-fg/60">
                                  {item.name_cn}
                                </div>
                              )}
                              <div className="font-mono text-xs text-fg/60">
                                {item.id}
                              </div>
                              {item.summary ? (
                                <div className="line-clamp-2 text-xs text-fg/70">
                                  {item.summary}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                isDisabled={isSearchingBgmtv || isCreatingFromBgmtv}
                onPress={() => {
                  setShowBgmtvModal(false)
                  setBgmtvQuery('')
                  setBgmtvSearchResults([])
                  setSelectedBgmtvSubjects(new Set())
                  setHasSearchedBgmtv(false)
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isCreatingFromBgmtv}
                isDisabled={
                  selectedBgmtvSubjects.size === 0 || isSearchingBgmtv
                }
                onPress={() => void handleCreateFromBgmtv()}
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
