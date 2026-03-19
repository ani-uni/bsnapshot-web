import type { DateValue, Key, TimeValue } from '@heroui/react'
import {
  Accordion,
  Autocomplete,
  Button,
  Calendar,
  Card,
  DateField,
  DatePicker,
  Header,
  Input,
  Label,
  ListBox,
  NumberField,
  SearchField,
  Select,
  Separator,
  TextField,
  TimeField,
  toast,
  useFilter,
} from '@heroui/react'
import { fromAbsolute } from '@internationalized/date'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ClipTimeInput } from './ClipTimeInput'
import type {
  EpisodeTreeSection,
  PregenEdit,
  PregenResponse,
  SeasonEpisodeItem,
} from './types'
import { detectIdType, episodeLabel } from './utils'

export default function AddCapture({
  apiBaseUrl,
  onCaptureCreated,
}: {
  apiBaseUrl: string
  onCaptureCreated: () => void
}) {
  const [idType, setIdType] = useState<Key>('auto')
  const [idInput, setIdInput] = useState('')
  const [isFetchingPregen, setIsFetchingPregen] = useState(false)
  const [pregenEdit, setPregenEdit] = useState<PregenEdit | null>(null)
  const [isCreatingCaptures, setIsCreatingCaptures] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [creationProgress, setCreationProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  const [episodeTree, setEpisodeTree] = useState<EpisodeTreeSection[]>([])
  const [episodeTreeLoaded, setEpisodeTreeLoaded] = useState(false)
  const [episodeSearch, setEpisodeSearch] = useState('')
  const { contains } = useFilter({ sensitivity: 'base' })

  const fetchEpisodeTree = useCallback(async () => {
    try {
      const seasonsRes = await fetch(`${apiBaseUrl}/api/seasons`)
      const seasons: Array<{ id: string; title: string | null }> = seasonsRes.ok
        ? await seasonsRes.json()
        : []

      const [defaultRes, ...seasonResults] = await Promise.all([
        fetch(`${apiBaseUrl}/api/seasons/default/episodes`),
        ...seasons.map((s) =>
          fetch(`${apiBaseUrl}/api/seasons/${s.id}/episodes`),
        ),
      ])

      const defaultEps: SeasonEpisodeItem[] = defaultRes.ok
        ? await defaultRes.json()
        : []

      const tree: EpisodeTreeSection[] = []

      for (let i = 0; i < seasons.length; i++) {
        const eps: SeasonEpisodeItem[] = seasonResults[i].ok
          ? await seasonResults[i].json()
          : []
        if (eps.length > 0) {
          tree.push({ season: seasons[i], episodes: eps })
        }
      }

      if (defaultEps.length > 0) {
        tree.push({ season: null, episodes: defaultEps })
      }

      setEpisodeTree(tree)
    } catch {
      // silently fail
    }
  }, [apiBaseUrl])

  const ensureEpisodeTree = useCallback(() => {
    if (!episodeTreeLoaded) {
      setEpisodeTreeLoaded(true)
      void fetchEpisodeTree()
    }
  }, [episodeTreeLoaded, fetchEpisodeTree])

  const handleFetchPregen = async () => {
    const input = idInput.trim()
    if (!input) {
      toast.warning('请输入ID')
      return
    }

    const type = idType === 'auto' ? detectIdType(input) : String(idType)

    setIsFetchingPregen(true)
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/tasks/pregen/${type}/${encodeURIComponent(input)}`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as PregenResponse
      setPregenEdit({
        aid: data.aid,
        bvid: data.bvid,
        title: data.title,
        pubdate: data.pubdate,
        upMid: String(data.upMid),
        pages: data.pages.map((p) => ({
          cid: p.cid,
          page: p.page,
          part: p.part,
          duration: p.duration,
          clips: [[0, p.duration, 0]],
        })),
      })
      setIsChecked(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(`查询失败：${errorMsg}`)
    } finally {
      setIsFetchingPregen(false)
    }
  }

  const handleClearPregen = () => {
    setPregenEdit(null)
    setIdInput('')
    setIsChecked(false)
  }

  const handleDurationChange = (pageIndex: number, newDuration: number) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        duration: newDuration,
        clips: [[0, newDuration, 0]],
      }
      return { ...prev, pages: newPages }
    })
  }

  const handleClipChange = (
    pageIndex: number,
    clipIndex: number,
    field: 0 | 1,
    value: number,
  ) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      const newClips = [...newPages[pageIndex].clips]
      const newClip = [...newClips[clipIndex]] as [
        number,
        number,
        number,
        string?,
      ]
      newClip[field] = value
      newClips[clipIndex] = newClip
      newPages[pageIndex] = { ...newPages[pageIndex], clips: newClips }
      return { ...prev, pages: newPages }
    })
  }

  const handleClipEpOffsetChange = (
    pageIndex: number,
    clipIndex: number,
    value: number,
  ) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      const newClips = [...newPages[pageIndex].clips]
      const newClip = [...newClips[clipIndex]] as [
        number,
        number,
        number,
        string?,
      ]
      newClip[2] = value
      newClips[clipIndex] = newClip
      newPages[pageIndex] = { ...newPages[pageIndex], clips: newClips }
      return { ...prev, pages: newPages }
    })
  }

  const handleAddClip = (pageIndex: number) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      const page = newPages[pageIndex]
      const lastEnd =
        page.clips.length > 0 ? page.clips[page.clips.length - 1][1] : 0
      newPages[pageIndex] = {
        ...page,
        clips: [...page.clips, [lastEnd, page.duration, 0]],
      }
      return { ...prev, pages: newPages }
    })
  }

  const handleRemoveClip = (pageIndex: number, clipIndex: number) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      const page = newPages[pageIndex]
      newPages[pageIndex] = {
        ...page,
        clips: page.clips.filter((_, i) => i !== clipIndex),
      }
      return { ...prev, pages: newPages }
    })
  }

  const handleClipEpisodeChange = (
    pageIndex: number,
    clipIndex: number,
    episodeId: string | null,
  ) => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const newPages = [...prev.pages]
      const newClips = [...newPages[pageIndex].clips]
      const clip = newClips[clipIndex]
      const entry: [number, number, number, string?] = [
        clip[0],
        clip[1],
        clip[2],
      ]
      if (episodeId) {
        entry.push(episodeId)
      }
      newClips[clipIndex] = entry
      newPages[pageIndex] = { ...newPages[pageIndex], clips: newClips }
      return { ...prev, pages: newPages }
    })
  }

  const handleCheck = () => {
    setPregenEdit((prev) => {
      if (!prev) return prev
      const MAX = 360
      const newPages = prev.pages.map((page) => {
        const newClips: Array<[number, number, number, string?]> = []
        for (const clip of page.clips) {
          const [start, end, epOffset, epId] = clip
          if (end - start > MAX) {
            let cursor = start
            let epCursor = epOffset
            while (cursor < end) {
              const chunkEnd = Math.min(cursor + MAX, end)
              const chunkDuration = chunkEnd - cursor
              const entry: [number, number, number, string?] = [
                cursor,
                chunkEnd,
                epCursor,
              ]
              if (epId !== undefined) entry.push(epId)
              newClips.push(entry)
              cursor = chunkEnd
              epCursor += chunkDuration
            }
          } else {
            newClips.push([...clip] as [number, number, number, string?])
          }
        }
        return { ...page, clips: newClips }
      })
      return { ...prev, pages: newPages }
    })
    setIsChecked(true)
  }

  const handleCreateAll = async () => {
    if (!pregenEdit) return

    const pagesToCreate = pregenEdit.pages.filter(
      (page) => page.clips.length > 0,
    )

    if (pagesToCreate.length === 0) {
      toast.warning('没有需要创建的采集')
      return
    }

    setIsCreatingCaptures(true)
    setCreationProgress({ current: 0, total: pagesToCreate.length })

    try {
      for (let i = 0; i < pagesToCreate.length; i++) {
        const page = pagesToCreate[i]
        setCreationProgress({ current: i + 1, total: pagesToCreate.length })

        const createRes = await fetch(`${apiBaseUrl}/api/tasks/captures/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clips: page.clips,
            cid: page.cid,
            pubdate: pregenEdit.pubdate,
            upMid: pregenEdit.upMid,
          }),
        })
        if (!createRes.ok) {
          throw new Error(`P${page.page} 创建失败：HTTP ${createRes.status}`)
        }
      }

      toast.success('采集创建完成')
      setPregenEdit(null)
      setIdInput('')
      setIsChecked(false)
      onCaptureCreated()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.danger(errorMsg)
    } finally {
      setIsCreatingCaptures(false)
      setCreationProgress(null)
    }
  }

  const allClipsHaveEpisode = pregenEdit
    ? pregenEdit.pages.every(
        (page) => page.clips.length === 0 || page.clips.every((c) => !!c[3]),
      )
    : false

  return (
    <Card className="mb-6 p-6">
      <Card.Header>
        <Card.Title>添加采集</Card.Title>
      </Card.Header>
      <Separator />
      <Card.Content>
        {/* Input row */}
        <div className="flex items-end gap-3">
          <Select
            value={idType}
            onChange={(value) => setIdType(value || 'auto')}
            className="w-28"
            variant="secondary"
          >
            <Label className="sr-only">ID类型</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="auto" textValue="自动">
                  自动
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="cid" textValue="cid">
                  cid
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField
            value={idInput}
            onChange={setIdInput}
            className="flex-1"
            isDisabled={isFetchingPregen || isCreatingCaptures}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !isFetchingPregen &&
                !isCreatingCaptures
              ) {
                void handleFetchPregen()
              }
            }}
            variant="secondary"
          >
            <Label className="sr-only">ID</Label>
            <Input
              placeholder={`输入${idType === 'auto' ? 'aid / bvid' : 'cid'}`}
            />
          </TextField>

          <Button
            isPending={isFetchingPregen}
            isDisabled={isCreatingCaptures}
            onPress={() => void handleFetchPregen()}
          >
            查询
          </Button>
        </div>

        {/* Pregen result */}
        {pregenEdit && (
          <div className="mt-4 space-y-4">
            <div className="space-y-3 rounded border border-border p-4">
              {/* Read-only fields */}
              {idType === 'auto' && (
                <>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-sm text-muted">aid</div>
                      <div className="font-mono text-sm">{pregenEdit.aid}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">bvid</div>
                      <div className="font-mono text-sm">{pregenEdit.bvid}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">标题</div>
                    <div className="font-mono text-sm">{pregenEdit.title}</div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-4">
                <TextField
                  value={pregenEdit.upMid}
                  onChange={(v) =>
                    setPregenEdit((prev) =>
                      prev ? { ...prev, upMid: v } : prev,
                    )
                  }
                  isDisabled={pregenEdit.upMid !== '0' || isChecked}
                  variant="secondary"
                >
                  <Label>UP主 mid</Label>
                  <Input />
                </TextField>

                <DatePicker
                  granularity="second"
                  hourCycle={24}
                  value={
                    fromAbsolute(
                      pregenEdit.pubdate * 1000,
                      'Asia/Shanghai',
                    ) as unknown as DateValue
                  }
                  onChange={(v) => {
                    if (!v) return
                    setPregenEdit((prev) =>
                      prev
                        ? {
                            ...prev,
                            pubdate: Math.floor(
                              v.toDate('Asia/Shanghai').getTime() / 1000,
                            ),
                          }
                        : prev,
                    )
                  }}
                >
                  {({ state }) => (
                    <>
                      <Label>发布日期</Label>
                      <DateField.Group fullWidth variant="secondary">
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                        <DatePicker.Trigger className="justify-end mr-4">
                          <DatePicker.TriggerIndicator />
                        </DatePicker.Trigger>
                      </DateField.Group>
                      <DatePicker.Popover className="flex flex-col gap-3">
                        <Calendar>
                          <Calendar.Header>
                            <Calendar.YearPickerTrigger>
                              <Calendar.YearPickerTriggerHeading />
                              <Calendar.YearPickerTriggerIndicator />
                            </Calendar.YearPickerTrigger>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                          <Calendar.YearPickerGrid>
                            <Calendar.YearPickerGridBody>
                              {({ year }) => (
                                <Calendar.YearPickerCell year={year} />
                              )}
                            </Calendar.YearPickerGridBody>
                          </Calendar.YearPickerGrid>
                        </Calendar>
                        <div className="flex items-center justify-between">
                          <Label>时间</Label>
                          <TimeField
                            granularity="second"
                            name="time"
                            value={state.timeValue}
                            onChange={(v) => state.setTimeValue(v as TimeValue)}
                          >
                            <TimeField.Group variant="secondary">
                              <TimeField.Input>
                                {(segment) => (
                                  <TimeField.Segment segment={segment} />
                                )}
                              </TimeField.Input>
                            </TimeField.Group>
                          </TimeField>
                        </div>
                      </DatePicker.Popover>
                    </>
                  )}
                </DatePicker>
              </div>
            </div>

            {/* Pages list */}
            <Accordion
              allowsMultipleExpanded
              variant="surface"
              className="border"
            >
              {pregenEdit.pages.map((page, pageIndex) => (
                <Accordion.Item key={page.cid} id={String(page.cid)}>
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      P{page.page} - {page.part}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <div className="space-y-3 p-4">
                      <div className="font-mono text-xs text-muted">
                        cid: {page.cid}
                      </div>

                      <NumberField
                        value={page.duration}
                        onChange={(v) => handleDurationChange(pageIndex, v)}
                        className="w-full max-w-64"
                        variant="secondary"
                        isDisabled={idType === 'auto' || isChecked}
                      >
                        <Label>时长 (秒)</Label>
                        <NumberField.Group>
                          <NumberField.DecrementButton />
                          <NumberField.Input />
                          <NumberField.IncrementButton />
                        </NumberField.Group>
                      </NumberField>

                      <div>
                        <div className="mb-2 text-sm font-medium">片段</div>
                        <div className="space-y-2">
                          {page.clips.map((clip, clipIndex) => (
                            <div
                              key={`${clip[0]}-${clip[1]}-${clipIndex}`}
                              className="relative space-y-2 rounded border border-border p-2 pt-8"
                            >
                              <Button
                                variant="danger"
                                size="sm"
                                className="absolute right-1 top-1"
                                isDisabled={isChecked}
                                onPress={() =>
                                  handleRemoveClip(pageIndex, clipIndex)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Label className="text-sm text-muted">
                                抓取视频起止时间
                              </Label>
                              <div className="flex flex-wrap items-end gap-2">
                                <ClipTimeInput
                                  value={clip[0]}
                                  onChange={(v) =>
                                    handleClipChange(pageIndex, clipIndex, 0, v)
                                  }
                                  isDisabled={isChecked}
                                />
                                <span className="text-sm text-muted">至</span>
                                <ClipTimeInput
                                  value={clip[1]}
                                  onChange={(v) =>
                                    handleClipChange(pageIndex, clipIndex, 1, v)
                                  }
                                  isDisabled={isChecked}
                                />
                              </div>
                              <Label className="text-sm text-muted">
                                实际剧集进度偏移
                              </Label>
                              <div className="flex flex-wrap items-end gap-2">
                                <ClipTimeInput
                                  value={clip[2]}
                                  onChange={(v) =>
                                    handleClipEpOffsetChange(
                                      pageIndex,
                                      clipIndex,
                                      v,
                                    )
                                  }
                                  isDisabled={isChecked}
                                />
                                <span className="text-sm text-muted">至</span>
                                <ClipTimeInput
                                  value={clip[2] + (clip[1] - clip[0])}
                                  onChange={() => {}}
                                  isDisabled
                                />
                              </div>
                              <Label className="text-sm text-muted">
                                归属剧集
                              </Label>
                              <Autocomplete
                                className="w-full sm:w-64"
                                selectionMode="single"
                                value={clip[3] ?? null}
                                onChange={(value) => {
                                  handleClipEpisodeChange(
                                    pageIndex,
                                    clipIndex,
                                    value && value !== ''
                                      ? String(value)
                                      : null,
                                  )
                                  if (value && value !== '') {
                                    const section = episodeTree.find((s) =>
                                      s.episodes.some((ep) => ep.id === String(value)),
                                    )
                                    setEpisodeSearch(
                                      section?.season?.title || '',
                                    )
                                  }
                                }}
                                onOpenChange={(isOpen) => {
                                  if (isOpen) ensureEpisodeTree()
                                }}
                                variant="secondary"
                                isDisabled={isChecked}
                              >
                                <Label className="sr-only">Episode</Label>
                                <Autocomplete.Trigger isDisabled={isChecked}>
                                  <Autocomplete.Value />
                                  <Autocomplete.Indicator />
                                </Autocomplete.Trigger>
                                <Autocomplete.Popover>
                                  <Autocomplete.Filter
                                    filter={contains}
                                    inputValue={episodeSearch}
                                    onInputChange={setEpisodeSearch}
                                  >
                                    <SearchField
                                      name="search"
                                      variant="secondary"
                                    >
                                      <SearchField.Group>
                                        <SearchField.SearchIcon />
                                        <SearchField.Input placeholder="搜索剧集..." />
                                        <SearchField.ClearButton />
                                      </SearchField.Group>
                                    </SearchField>
                                    <ListBox>
                                      <ListBox.Item id="" textValue="无">
                                        无
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                      {episodeTree.map((section) => (
                                        <ListBox.Section
                                          key={
                                            section.season?.id ?? '__default'
                                          }
                                        >
                                          <Header>
                                            {section.season
                                              ? section.season.title || '未命名'
                                              : '无归属'}
                                          </Header>
                                          {section.episodes.map((ep) => (
                                            <ListBox.Item
                                              key={ep.id}
                                              id={ep.id}
                                              textValue={`${section.season ? section.season.title || '未命名' : '无归属'} ${episodeLabel(ep)}`}
                                            >
                                              {episodeLabel(ep)}
                                              <ListBox.ItemIndicator />
                                            </ListBox.Item>
                                          ))}
                                        </ListBox.Section>
                                      ))}
                                    </ListBox>
                                  </Autocomplete.Filter>
                                </Autocomplete.Popover>
                              </Autocomplete>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          isDisabled={isChecked}
                          onPress={() => handleAddClip(pageIndex)}
                        >
                          <Plus />
                          添加片段
                        </Button>
                      </div>
                    </div>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              {creationProgress && (
                <span className="text-sm text-muted">
                  {creationProgress.current} / {creationProgress.total}
                </span>
              )}
              <Button
                variant="tertiary"
                isDisabled={isCreatingCaptures}
                onPress={handleClearPregen}
              >
                清除
              </Button>
              <Button
                isPending={isCreatingCaptures}
                isDisabled={!isChecked && !allClipsHaveEpisode}
                onPress={() => {
                  if (isChecked) {
                    void handleCreateAll()
                  } else {
                    handleCheck()
                  }
                }}
              >
                {isChecked ? '创建采集' : '检查'}
                {pregenEdit && (
                  <span className="ml-1">
                    (
                    {
                      pregenEdit.pages.filter((p) => p.clips.some((c) => c[3]))
                        .length
                    }
                    /{pregenEdit.pages.length})
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  )
}
