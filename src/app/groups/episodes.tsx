import {
  Accordion,
  AlertDialog,
  Autocomplete,
  Button,
  Card,
  type Key,
  ListBox,
  Modal,
  SearchField,
  Spinner,
  toast,
  useFilter,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronRight, Edit, Trash, Unlink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { apiBaseUrlAtom } from '@/atoms/api'
import {
  type BreadcrumbItem,
  breadcrumbsAtom,
} from '@/atoms/groups/breadcrumbs'
import EditableText from '@/components/EditableText'

type SeriesDetail = {
  id: string
  title: string | null
}

type SeasonDetail = {
  id: string
  title: string | null
  seriesId: string | null
}

type EpisodeDetail = {
  id: string
  title: string | null
  seasonId: string | null
}

type ClipItem = {
  id: string
  title: string | null
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

export default function GroupEpisodesPage() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [season, setSeason] = useState<SeasonDetail | null>(null)
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [clipList, setClipList] = useState<ClipItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonList, setSeasonList] = useState<SeasonDetail[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<Key | null>(null)
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false)
  const [isUpdatingSeason, setIsUpdatingSeason] = useState(false)
  const { contains } = useFilter({ sensitivity: 'base' })

  useEffect(() => {
    const items: BreadcrumbItem[] = [{ label: '合集', href: '/groups' }]
    if (series) {
      items.push({
        label: displayTitle(series.title),
        href: `/groups/series/${series.id}`,
      })
    }
    if (season) {
      items.push({
        label: displayTitle(season.title),
        href: `/groups/seasons/${season.id}`,
      })
    }
    if (episode) {
      items.push({ label: displayTitle(episode.title) })
    }
    setBreadcrumbs(items)
  }, [series, season, episode, setBreadcrumbs])

  const fetchData = useCallback(async () => {
    if (!episodeId) return

    setIsLoading(true)
    try {
      const episodeResponse = await fetch(
        `${apiBaseUrl}/api/episodes/${episodeId}`,
      )
      if (!episodeResponse.ok) {
        throw new Error(`加载剧集失败: HTTP ${episodeResponse.status}`)
      }
      const episodeData = (await episodeResponse.json()) as EpisodeDetail
      setEpisode(episodeData)

      const clipsResponse = await fetch(
        `${apiBaseUrl}/api/episodes/${episodeId}/clips`,
      )
      if (!clipsResponse.ok) {
        throw new Error(`加载片段列表失败: HTTP ${clipsResponse.status}`)
      }
      const clipsData = (await clipsResponse.json()) as ClipItem[]
      setClipList(clipsData)

      if (episodeData.seasonId) {
        const seasonResponse = await fetch(
          `${apiBaseUrl}/api/seasons/${episodeData.seasonId}`,
        )
        if (seasonResponse.ok) {
          const seasonData = (await seasonResponse.json()) as SeasonDetail
          setSeason(seasonData)

          if (seasonData.seriesId) {
            const seriesResponse = await fetch(
              `${apiBaseUrl}/api/series/${seasonData.seriesId}`,
            )
            if (seriesResponse.ok) {
              const seriesData = (await seriesResponse.json()) as SeriesDetail
              setSeries(seriesData)
            }
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载数据失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, episodeId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!showSeasonModal) return

    const fetchSeasonsList = async () => {
      setIsLoadingSeasons(true)
      try {
        const response = await fetch(`${apiBaseUrl}/api/seasons`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const seasonsListData = (await response.json()) as SeasonDetail[]
        setSeasonList(seasonsListData)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`加载季度列表失败：${errorMsg}`)
      } finally {
        setIsLoadingSeasons(false)
      }
    }

    void fetchSeasonsList()
  }, [apiBaseUrl, showSeasonModal])

  useEffect(() => {
    if (showSeasonModal) {
      // modal打开时，初始化已选中的season
      setSelectedSeasonId(episode?.seasonId ?? null)
    }
  }, [showSeasonModal, episode?.seasonId])

  const handleSeasonChange = async (newSeasonId: string | null) => {
    if (!episode?.id) return

    setIsUpdatingSeason(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          season: newSeasonId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const updatedEpisode = (await response.json()) as EpisodeDetail
      setEpisode(updatedEpisode)

      if (newSeasonId) {
        const newSeason = seasonList.find((s) => s.id === newSeasonId)
        if (newSeason) {
          setSeason(newSeason)
        }
      } else {
        setSeason(null)
      }

      setShowSeasonModal(false)
      toast.success('关联季度已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新关联季度失败：${errorMsg}`)
    } finally {
      setIsUpdatingSeason(false)
    }
  }

  const handleSaveTitle = async (newTitle: string) => {
    if (!episode?.id) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const updatedEpisode = (await response.json()) as EpisodeDetail
      setEpisode(updatedEpisode)
      toast.success('剧集名称已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新剧集名称失败：${errorMsg}`)
      throw error
    }
  }

  const handleDeleteEpisode = async () => {
    if (!episode?.id) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/episodes/${episode.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      toast.success('剧集已删除')
      setShowDeleteDialog(false)
      if (episode.seasonId) {
        navigate(`/groups/seasons/${episode.seasonId}`)
      } else {
        navigate('/groups')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除剧集失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="p-6">
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : !episode ? (
          <p className="text-muted">未找到剧集详情</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 text-sm text-muted">剧集 ID</div>
                  <div className="font-mono text-sm">{episode.id}</div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  isPending={isDeleting}
                  onPress={() => setShowDeleteDialog(true)}
                >
                  {({ isPending }) => (
                    <>
                      {!isPending && <Trash />}
                      {isPending ? '删除中...' : '删除'}
                    </>
                  )}
                </Button>
              </div>
              <div className="mb-4">
                <div className="mb-2 text-sm text-muted">剧集名称</div>
                <EditableText
                  value={displayTitle(episode.title)}
                  onSave={handleSaveTitle}
                  placeholder="输入剧集名称"
                />
              </div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 text-sm text-muted">所属季度</div>
                  <div className="font-mono text-sm">
                    {season ? displayTitle(season.title) : '无所属季度'}
                  </div>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setShowSeasonModal(true)}
                >
                  <Edit />
                  编辑
                </Button>
              </div>
              {series && (
                <div className="mb-4">
                  <div className="mb-2 text-sm text-muted">所属系列</div>
                  <div className="font-mono text-sm">
                    {displayTitle(series.title)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">片段列表</h2>
              {clipList.length === 0 ? (
                <p className="text-muted">当前剧集下暂无片段</p>
              ) : (
                <Accordion>
                  {clipList.map((clip) => (
                    <Accordion.Item key={clip.id} id={clip.id}>
                      <Accordion.Heading>
                        <Accordion.Trigger
                          onPress={() => navigate(`/groups/clips/${clip.id}`)}
                        >
                          {displayTitle(clip.title)}
                          <Accordion.Indicator>
                            <ChevronRight />
                          </Accordion.Indicator>
                        </Accordion.Trigger>
                      </Accordion.Heading>
                    </Accordion.Item>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        )}
      </Card.Content>

      <Modal.Backdrop
        isOpen={showSeasonModal}
        onOpenChange={setShowSeasonModal}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-100">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>选择所属季度</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Autocomplete
                className="w-full"
                placeholder="选择季度"
                selectionMode="single"
                value={selectedSeasonId}
                onChange={(value) => handleSeasonChange(value as string | null)}
                isDisabled={isUpdatingSeason || isLoadingSeasons}
              >
                <Autocomplete.Trigger>
                  <Autocomplete.Value />
                  <Autocomplete.Indicator />
                </Autocomplete.Trigger>
                <Autocomplete.Popover>
                  <Autocomplete.Filter filter={contains}>
                    <SearchField autoFocus name="search" variant="secondary">
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="搜索季度..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <ListBox>
                      {seasonList.map((s) => (
                        <ListBox.Item
                          key={s.id}
                          id={s.id}
                          textValue={displayTitle(s.title)}
                        >
                          {displayTitle(s.title)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Autocomplete.Filter>
                </Autocomplete.Popover>
              </Autocomplete>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="danger"
                isDisabled={
                  isUpdatingSeason || isLoadingSeasons || !episode?.seasonId
                }
                onPress={() => handleSeasonChange(null)}
              >
                <Unlink />
                解除关联
              </Button>
              <Button
                variant="tertiary"
                isDisabled={isUpdatingSeason || isLoadingSeasons}
                onPress={() => setShowSeasonModal(false)}
              >
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <AlertDialog.Backdrop
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>删除剧集？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                确定要删除剧集 <strong>{displayTitle(episode?.title)}</strong>{' '}
                吗？此操作无法撤销。
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
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
                onPress={handleDeleteEpisode}
              >
                {({ isPending }) => (isPending ? '删除中...' : '删除')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Card>
  )
}
