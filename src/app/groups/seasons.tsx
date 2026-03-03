import type { Key } from '@heroui/react'

import {
  Accordion,
  AlertDialog,
  Autocomplete,
  Button,
  Card,
  Label,
  ListBox,
  Modal,
  SearchField,
  Spinner,
  Switch,
  Tag,
  TagGroup,
  toast,
  useFilter,
} from '@heroui/react'
import { useAtom, useAtomValue } from 'jotai'
import { ChevronRight, Edit, Link, Plus, Trash, Unlink } from 'lucide-react'
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

type EpisodeItem = {
  id: string
  title: string | null
}

type AutocompleteRenderProps = {
  defaultChildren: React.ReactNode
  isPlaceholder: boolean
  state: {
    selectedItems: Array<{ key: Key }>
  }
}

function displayTitle(title: string | null | undefined) {
  return title?.trim() || '未命名'
}

export default function GroupSeasonsPage() {
  const { seasonId } = useParams<{ seasonId: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [season, setSeason] = useState<SeasonDetail | null>(null)
  const [episodeList, setEpisodeList] = useState<EpisodeItem[]>([])
  const [seriesList, setSeriesList] = useState<SeriesDetail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false)
  const [isUpdatingSeries, setIsUpdatingSeries] = useState(false)
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [isLoadingSeriesList, setIsLoadingSeriesList] = useState(false)
  const [showLinkEpisodeModal, setShowLinkEpisodeModal] = useState(false)
  const [availableEpisodes, setAvailableEpisodes] = useState<EpisodeItem[]>([])
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Key[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [isLinkingEpisodes, setIsLinkingEpisodes] = useState(false)
  const [onlyDefault, setOnlyDefault] = useState(true)
  const isDefaultSeason = season?.id === 'default'
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
      items.push({ label: displayTitle(season.title) })
    }
    setBreadcrumbs(items)
  }, [series, season, setBreadcrumbs])

  const fetchData = useCallback(async () => {
    if (!seasonId) return

    setIsLoading(true)
    try {
      const [seasonResponse, episodesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/seasons/${seasonId}`),
        fetch(`${apiBaseUrl}/api/seasons/${seasonId}/episodes`),
      ])

      if (!seasonResponse.ok) {
        throw new Error(`加载季度失败: HTTP ${seasonResponse.status}`)
      }
      if (!episodesResponse.ok) {
        throw new Error(`加载剧集列表失败: HTTP ${episodesResponse.status}`)
      }

      const seasonData = (await seasonResponse.json()) as SeasonDetail
      const episodesData = (await episodesResponse.json()) as EpisodeItem[]
      setSeason(seasonData)
      setEpisodeList(episodesData)

      if (seasonData.seriesId) {
        const seriesResponse = await fetch(
          `${apiBaseUrl}/api/series/${seasonData.seriesId}`,
        )
        if (seriesResponse.ok) {
          const seriesData = (await seriesResponse.json()) as SeriesDetail
          setSeries(seriesData)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载数据失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, seasonId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!showSeriesModal) return

    const fetchSeriesList = async () => {
      setIsLoadingSeriesList(true)
      try {
        const response = await fetch(`${apiBaseUrl}/api/series`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const seriesListData = (await response.json()) as SeriesDetail[]
        setSeriesList(seriesListData)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`加载系列列表失败：${errorMsg}`)
      } finally {
        setIsLoadingSeriesList(false)
      }
    }

    void fetchSeriesList()
  }, [apiBaseUrl, showSeriesModal])

  useEffect(() => {
    if (!showLinkEpisodeModal) return

    const fetchEpisodesList = async () => {
      setIsLoadingEpisodes(true)
      try {
        const url = onlyDefault
          ? `${apiBaseUrl}/api/seasons/default/episodes`
          : `${apiBaseUrl}/api/episodes`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const episodesData = (await response.json()) as EpisodeItem[]

        // 合并当前season已有的episodes，确保它们总是显示在列表中
        const episodeIds = new Set(episodesData.map((ep) => ep.id))
        const additionalEpisodes = episodeList.filter(
          (ep) => !episodeIds.has(ep.id),
        )

        setAvailableEpisodes([...episodesData, ...additionalEpisodes])
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`加载剧集列表失败：${errorMsg}`)
      } finally {
        setIsLoadingEpisodes(false)
      }
    }

    void fetchEpisodesList()
  }, [apiBaseUrl, showLinkEpisodeModal, onlyDefault, episodeList])

  useEffect(() => {
    if (showLinkEpisodeModal) {
      // modal打开时，初始化已选中的episodes
      setSelectedEpisodeIds(episodeList.map((ep) => ep.id as Key))
    }
  }, [showLinkEpisodeModal, episodeList])

  const handleSaveTitle = async (newTitle: string) => {
    if (!season?.id) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${season.id}`, {
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

      const updatedSeason = (await response.json()) as SeasonDetail
      setSeason(updatedSeason)
      toast.success('季度名称已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新季度名称失败：${errorMsg}`)
      throw error
    }
  }

  const handleDeleteSeason = async () => {
    if (!season?.id || isDefaultSeason) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${season.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      toast.success('季度已删除')
      setShowDeleteDialog(false)
      if (season.seriesId) {
        navigate(`/groups/series/${season.seriesId}`)
      } else {
        navigate('/groups')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除季度失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateEpisode = async () => {
    if (!season?.id) return

    setIsCreatingEpisode(true)
    try {
      const createResponse = await fetch(`${apiBaseUrl}/api/episodes`, {
        method: 'POST',
      })

      if (!createResponse.ok) {
        throw new Error(`HTTP ${createResponse.status}`)
      }

      const newEpisode = (await createResponse.json()) as EpisodeItem

      if (!isDefaultSeason) {
        const patchResponse = await fetch(
          `${apiBaseUrl}/api/episodes/${newEpisode.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              season: season.id,
            }),
          },
        )

        if (!patchResponse.ok) {
          throw new Error(`HTTP ${patchResponse.status}`)
        }
      }

      toast.success('新建剧集成功')
      setEpisodeList((prev) => [...prev, newEpisode])
      navigate(`/groups/episodes/${newEpisode.id}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`新建剧集失败：${errorMsg}`)
    } finally {
      setIsCreatingEpisode(false)
    }
  }

  const handleSeriesChange = async (newSeriesId: string | null) => {
    if (!season?.id) return

    setIsUpdatingSeries(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${season.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          series: newSeriesId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const updatedSeason = (await response.json()) as SeasonDetail
      setSeason(updatedSeason)

      if (newSeriesId) {
        const newSeries = seriesList.find((s) => s.id === newSeriesId)
        if (newSeries) {
          setSeries(newSeries)
        }
      } else {
        setSeries(null)
      }

      setShowSeriesModal(false)
      toast.success('关联系列已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新关联系列失败：${errorMsg}`)
    } finally {
      setIsUpdatingSeries(false)
    }
  }

  const handleLinkEpisodes = async () => {
    if (!season?.id) return

    setIsLinkingEpisodes(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/seasons/${season.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodes: selectedEpisodeIds.map(String),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const updatedSeason = (await response.json()) as SeasonDetail
      setSeason(updatedSeason)
      setShowLinkEpisodeModal(false)
      setSelectedEpisodeIds([])
      toast.success('关联剧集已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新关联剧集失败：${errorMsg}`)
    } finally {
      setIsLinkingEpisodes(false)
    }
  }

  return (
    <Card className="p-6">
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : !season ? (
          <p className="text-muted">未找到季度详情</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 text-sm text-muted">季度 ID</div>
                  <div className="font-mono text-sm">{season.id}</div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  isDisabled={isDefaultSeason}
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
                <div className="mb-2 text-sm text-muted">季度名称</div>
                <EditableText
                  value={displayTitle(season.title)}
                  onSave={handleSaveTitle}
                  isDisabled={isDefaultSeason}
                  placeholder="输入季度名称"
                />
              </div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 text-sm text-muted">所属系列</div>
                  <div className="font-mono text-sm">
                    {series ? displayTitle(series.title) : '无所属系列'}
                  </div>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setShowSeriesModal(true)}
                >
                  <Edit />
                  编辑
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">剧集列表</h2>
                <div className="flex gap-2">
                  <Button
                    isPending={isLinkingEpisodes || isLoadingEpisodes}
                    onPress={() => setShowLinkEpisodeModal(true)}
                  >
                    <Link />
                    关联
                  </Button>
                  <Button
                    isPending={isCreatingEpisode}
                    onPress={handleCreateEpisode}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <Plus />
                        )}
                        新建
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {episodeList.length === 0 ? (
                <p className="text-muted">当前季度下暂无剧集</p>
              ) : (
                <Accordion>
                  {episodeList.map((episode) => (
                    <Accordion.Item key={episode.id} id={episode.id}>
                      <Accordion.Heading>
                        <Accordion.Trigger
                          onPress={() =>
                            navigate(`/groups/episodes/${episode.id}`)
                          }
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
            </div>
          </div>
        )}
      </Card.Content>

      <Modal.Backdrop
        isOpen={showSeriesModal}
        onOpenChange={setShowSeriesModal}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-100">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>选择所属系列</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Autocomplete
                className="w-full"
                placeholder="选择系列"
                selectionMode="single"
                value={season?.seriesId ?? null}
                onChange={(value) => handleSeriesChange(value as string | null)}
                isDisabled={isUpdatingSeries || isLoadingSeriesList}
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
                        <SearchField.Input placeholder="搜索系列..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <ListBox>
                      {seriesList
                        .filter((s) => s.id !== 'default')
                        .map((s) => (
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
                  isUpdatingSeries || isLoadingSeriesList || !season?.seriesId
                }
                onPress={() => handleSeriesChange(null)}
              >
                <Unlink />
                解除关联
              </Button>
              <Button
                variant="tertiary"
                isDisabled={isUpdatingSeries || isLoadingSeriesList}
                onPress={() => setShowSeriesModal(false)}
              >
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop
        isOpen={showLinkEpisodeModal}
        onOpenChange={setShowLinkEpisodeModal}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-100">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>关联剧集</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-4">
                <Switch
                  isSelected={onlyDefault}
                  onChange={setOnlyDefault}
                  isDisabled={isLoadingEpisodes}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">仅列出无所属剧集</Label>
                  </Switch.Content>
                </Switch>
              </div>
              <Autocomplete
                className="w-full"
                placeholder="选择剧集"
                selectionMode="multiple"
                value={selectedEpisodeIds}
                onChange={(keys) => setSelectedEpisodeIds(keys as Key[])}
                isDisabled={isLoadingEpisodes || isLinkingEpisodes}
              >
                <Autocomplete.Trigger>
                  <Autocomplete.Value>
                    {({
                      defaultChildren,
                      isPlaceholder,
                      state,
                    }: AutocompleteRenderProps) => {
                      if (
                        isPlaceholder ||
                        (state?.selectedItems?.length ?? 0) === 0
                      ) {
                        return defaultChildren
                      }

                      const selectedItemsKeys: Key[] =
                        state?.selectedItems?.map((item) => item.key) ?? []

                      return (
                        <TagGroup
                          size="sm"
                          onRemove={(keys) => {
                            setSelectedEpisodeIds((prev) =>
                              prev.filter((key) => !keys.has(key)),
                            )
                          }}
                        >
                          <TagGroup.List>
                            {selectedItemsKeys.map((selectedItemKey: Key) => {
                              const item = availableEpisodes.find(
                                (ep) => ep.id === selectedItemKey,
                              )

                              if (!item) return null

                              return (
                                <Tag key={item.id} id={item.id}>
                                  {displayTitle(item.title)}
                                </Tag>
                              )
                            })}
                          </TagGroup.List>
                        </TagGroup>
                      )
                    }}
                  </Autocomplete.Value>
                  <Autocomplete.Indicator />
                </Autocomplete.Trigger>
                <Autocomplete.Popover>
                  <Autocomplete.Filter filter={contains}>
                    <SearchField autoFocus name="search" variant="secondary">
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="搜索剧集..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <ListBox>
                      {availableEpisodes.map((ep) => (
                        <ListBox.Item
                          key={ep.id}
                          id={ep.id}
                          textValue={displayTitle(ep.title)}
                        >
                          {displayTitle(ep.title)}
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
                variant="tertiary"
                isDisabled={isLinkingEpisodes || isLoadingEpisodes}
                onPress={() => {
                  setShowLinkEpisodeModal(false)
                  setSelectedEpisodeIds([])
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isLinkingEpisodes}
                isDisabled={
                  isLoadingEpisodes || selectedEpisodeIds.length === 0
                }
                onPress={handleLinkEpisodes}
              >
                {({ isPending }) => (isPending ? '关联中...' : '确认关联')}
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
              <AlertDialog.Heading>删除季度？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                确定要删除季度 <strong>{displayTitle(season?.title)}</strong>{' '}
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
                isDisabled={isDefaultSeason}
                isPending={isDeleting}
                onPress={handleDeleteSeason}
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
