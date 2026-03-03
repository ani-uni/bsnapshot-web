import {
  Accordion,
  AlertDialog,
  Autocomplete,
  Button,
  Card,
  type Key,
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
import { ChevronRight, Link, Plus, Trash } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { apiBaseUrlAtom } from '@/atoms/api'
import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import EditableText from '@/components/EditableText'

type SeriesDetail = {
  id: string
  title: string | null
}

type SeasonItem = {
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

export default function GroupSeriesPage() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)
  const navigate = useNavigate()
  const [, setBreadcrumbs] = useAtom(breadcrumbsAtom)
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [seasonList, setSeasonList] = useState<SeasonItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreatingSeason, setIsCreatingSeason] = useState(false)
  const [showLinkSeasonModal, setShowLinkSeasonModal] = useState(false)
  const [availableSeasons, setAvailableSeasons] = useState<SeasonItem[]>([])
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Key[]>([])
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false)
  const [isLinkingSeasons, setIsLinkingSeasons] = useState(false)
  const [onlyDefault, setOnlyDefault] = useState(true)
  const isDefaultSeries = series?.id === 'default'
  const { contains } = useFilter({ sensitivity: 'base' })

  useEffect(() => {
    if (series) {
      setBreadcrumbs([
        { label: '合集', href: '/groups' },
        { label: displayTitle(series.title) },
      ])
    }
  }, [series, setBreadcrumbs])

  const fetchData = useCallback(async () => {
    if (!seriesId) return

    setIsLoading(true)
    try {
      const [seriesResponse, seasonsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/series/${seriesId}`),
        fetch(`${apiBaseUrl}/api/series/${seriesId}/seasons`),
      ])

      if (!seriesResponse.ok) {
        throw new Error(`加载系列失败: HTTP ${seriesResponse.status}`)
      }
      if (!seasonsResponse.ok) {
        throw new Error(`加载季度列表失败: HTTP ${seasonsResponse.status}`)
      }

      const seriesData = (await seriesResponse.json()) as SeriesDetail
      const seasonsData = (await seasonsResponse.json()) as SeasonItem[]

      setSeries(seriesData)
      setSeasonList(seasonsData)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`加载数据失败：${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, seriesId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSaveTitle = async (newTitle: string) => {
    if (!series?.id) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/series/${series.id}`, {
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

      const updatedSeries = (await response.json()) as SeriesDetail
      setSeries(updatedSeries)
      toast.success('系列名称已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新系列名称失败：${errorMsg}`)
      throw error
    }
  }

  const handleDeleteSeries = async () => {
    if (!series?.id || isDefaultSeries) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/series/${series.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      toast.success('系列已删除')
      setShowDeleteDialog(false)
      navigate('/groups')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`删除系列失败：${errorMsg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateSeason = async () => {
    if (!series?.id) return

    setIsCreatingSeason(true)
    try {
      const createResponse = await fetch(`${apiBaseUrl}/api/seasons`, {
        method: 'POST',
      })

      if (!createResponse.ok) {
        throw new Error(`HTTP ${createResponse.status}`)
      }

      const newSeason = (await createResponse.json()) as SeasonItem

      if (!isDefaultSeries) {
        const patchResponse = await fetch(
          `${apiBaseUrl}/api/seasons/${newSeason.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              series: series.id,
            }),
          },
        )

        if (!patchResponse.ok) {
          throw new Error(`HTTP ${patchResponse.status}`)
        }
      }

      toast.success('新建季度成功')
      setSeasonList((prev) => [...prev, newSeason])
      navigate(`/groups/seasons/${newSeason.id}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`新建季度失败：${errorMsg}`)
    } finally {
      setIsCreatingSeason(false)
    }
  }

  useEffect(() => {
    if (!showLinkSeasonModal) return

    const fetchSeasonsList = async () => {
      setIsLoadingSeasons(true)
      try {
        const url = onlyDefault
          ? `${apiBaseUrl}/api/series/default/seasons`
          : `${apiBaseUrl}/api/seasons`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        let seasonsData = (await response.json()) as SeasonItem[]

        // 当仅列出无所属季度时，过滤掉 default 虚拟季度
        if (onlyDefault) {
          seasonsData = seasonsData.filter((s) => s.id !== 'default')
        }

        // 合并当前series已有的seasons，确保它们总是显示在列表中
        const seasonIds = new Set(seasonsData.map((s) => s.id))
        const additionalSeasons = seasonList.filter((s) => !seasonIds.has(s.id))

        setAvailableSeasons([...seasonsData, ...additionalSeasons])
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`加载季度列表失败：${errorMsg}`)
      } finally {
        setIsLoadingSeasons(false)
      }
    }

    void fetchSeasonsList()
  }, [apiBaseUrl, showLinkSeasonModal, onlyDefault, seasonList])

  useEffect(() => {
    if (showLinkSeasonModal) {
      // modal打开时，初始化已选中的seasons
      setSelectedSeasonIds(seasonList.map((s) => s.id as Key))
    }
  }, [showLinkSeasonModal, seasonList])

  const handleLinkSeasons = async () => {
    if (!series?.id) return

    setIsLinkingSeasons(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/series/${series.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasons: selectedSeasonIds.map(String),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const updatedSeries = (await response.json()) as SeriesDetail
      setSeries(updatedSeries)
      setShowLinkSeasonModal(false)
      setSelectedSeasonIds([])
      toast.success('关联季度已更新')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`更新关联季度失败：${errorMsg}`)
    } finally {
      setIsLinkingSeasons(false)
    }
  }

  return (
    <Card className="p-6">
      <Card.Content>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner color="current" />
          </div>
        ) : !series ? (
          <p className="text-muted">未找到系列详情</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="mb-2 text-sm text-muted">系列 ID</div>
                  <div className="font-mono text-sm">{series.id}</div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  isDisabled={isDefaultSeries}
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
              <div className="mb-2 text-sm text-muted">系列名称</div>
              <EditableText
                value={displayTitle(series.title)}
                onSave={handleSaveTitle}
                isDisabled={isDefaultSeries}
                placeholder="输入系列名称"
              />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">季度列表</h2>
                <div className="flex gap-2">
                  <Button
                    isPending={isLinkingSeasons || isLoadingSeasons}
                    onPress={() => setShowLinkSeasonModal(true)}
                  >
                    <Link />
                    关联
                  </Button>
                  <Button
                    isPending={isCreatingSeason}
                    onPress={handleCreateSeason}
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
              {seasonList.length === 0 ? (
                <p className="text-muted">当前系列下暂无季度</p>
              ) : (
                <Accordion>
                  {seasonList.map((season) => (
                    <Accordion.Item key={season.id} id={season.id}>
                      <Accordion.Heading>
                        <Accordion.Trigger
                          onPress={() =>
                            navigate(`/groups/seasons/${season.id}`)
                          }
                        >
                          {displayTitle(season.title)}
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
        isOpen={showLinkSeasonModal}
        onOpenChange={setShowLinkSeasonModal}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-100">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>关联季度</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-4">
                <Switch
                  isSelected={onlyDefault}
                  onChange={setOnlyDefault}
                  isDisabled={isLoadingSeasons}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">仅列出无所属季度</Label>
                  </Switch.Content>
                </Switch>
              </div>
              <Autocomplete
                className="w-full"
                placeholder="选择季度"
                selectionMode="multiple"
                value={selectedSeasonIds}
                onChange={(keys) => setSelectedSeasonIds(keys as Key[])}
                isDisabled={isLoadingSeasons || isLinkingSeasons}
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
                            setSelectedSeasonIds((prev) =>
                              prev.filter((key) => !keys.has(key)),
                            )
                          }}
                        >
                          <TagGroup.List>
                            {selectedItemsKeys.map((selectedItemKey: Key) => {
                              const season = availableSeasons.find(
                                (s) => s.id === selectedItemKey,
                              )

                              if (!season) return null

                              return (
                                <Tag key={season.id} id={season.id}>
                                  {displayTitle(season.title)}
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
                        <SearchField.Input placeholder="搜索季度..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <ListBox>
                      {availableSeasons.map((season) => (
                        <ListBox.Item
                          key={season.id}
                          id={season.id}
                          textValue={displayTitle(season.title)}
                        >
                          {displayTitle(season.title)}
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
                isDisabled={isLinkingSeasons || isLoadingSeasons}
                onPress={() => {
                  setShowLinkSeasonModal(false)
                  setSelectedSeasonIds([])
                }}
              >
                关闭
              </Button>
              <Button
                isPending={isLinkingSeasons}
                isDisabled={isLoadingSeasons || selectedSeasonIds.length === 0}
                onPress={handleLinkSeasons}
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
              <AlertDialog.Heading>删除系列？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                确定要删除系列 <strong>{displayTitle(series?.title)}</strong>{' '}
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
                isDisabled={isDefaultSeries}
                isPending={isDeleting}
                onPress={handleDeleteSeries}
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
