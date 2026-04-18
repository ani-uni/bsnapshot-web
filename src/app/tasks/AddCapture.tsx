import type { DateValue, TimeValue } from '@heroui/react'
import {
  Accordion,
  Autocomplete,
  Button,
  Calendar,
  Card,
  Chip,
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
  TextArea,
  TextField,
  TimeField,
  toast,
  useFilter,
} from '@heroui/react'
import { fromAbsolute } from '@internationalized/date'
import type { PrimitiveAtom } from 'jotai'
import { useAtom, useAtomValue } from 'jotai'
import { Plus, Trash2 } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'

import {
  addCaptureAllClipsHaveEpisodeAtom,
  addCaptureClipBindingCountAtom,
  addCaptureCreationProgressAtom,
  addCaptureEpisodeSearchAtom,
  addCaptureEpisodeTreeAtom,
  addCaptureEpisodeTreeLoadedAtom,
  addCaptureFastCapModalContentAtom,
  addCaptureFastCapModalStateAtom,
  addCaptureFastcapManualAtom,
  addCaptureHasFastcapPresetAtom,
  addCaptureIdInputAtom,
  addCaptureIdTypeAtom,
  addCaptureIsAdvancedModeAtom,
  addCaptureIsCheckedAtom,
  addCaptureIsCreatingCapturesAtom,
  addCaptureIsFastCapModalOpenAtom,
  addCaptureIsFetchingPregenAtom,
  addCapturePregenEditAtom,
  addCapturePregenPageAtomsAtom,
  lastCreatedCaptureAidAtom,
} from '@/atoms/tasks/addCapture'
import FastCapModal from '@/components/FastCapModal'
import { createApiClient } from '@/utils/apiFetch'

import { ClipTimeInput } from './ClipTimeInput'
import type {
  EpisodeTreeSection,
  PageEdit,
  PregenEdit,
  PregenResponse,
  SeasonEpisodeItem,
} from './types'
import { episodeLabel } from './utils'

function buildPregenEdit(data: PregenResponse): PregenEdit {
  const presetByCid = new Map(
    (data.preset ?? []).map((item) => [item.cid, item]),
  )

  return {
    aid: data.aid,
    bvid: data.bvid,
    title: data.title,
    pubdate: data.pubdate,
    upMid: String(data.upMid),
    pages: data.pages.map((page) => {
      const preset = presetByCid.get(page.cid)
      return {
        cid: page.cid,
        page: page.page,
        part: page.part,
        duration: page.duration,
        clips: preset?.clips.length
          ? preset.clips.map(
              (clip) =>
                [clip[0], clip[1], clip[2], clip[3]] as [
                  number,
                  number,
                  number,
                  string?,
                ],
            )
          : [],
      }
    }),
  }
}

const AddCapturePageItem = memo(function AddCapturePageItem({
  pageAtom,
  idType,
  isChecked,
  contains,
  episodeSearch,
  setEpisodeSearch,
  episodeTree,
  ensureEpisodeTree,
}: {
  pageAtom: PrimitiveAtom<PageEdit>
  idType: 'auto' | 'cid'
  isChecked: boolean
  contains: (a: string, b: string) => boolean
  episodeSearch: string
  setEpisodeSearch: (value: string) => void
  episodeTree: EpisodeTreeSection[]
  ensureEpisodeTree: () => void
}) {
  const [page, setPage] = useAtom(pageAtom)

  const handleDurationChange = useCallback(
    (newDuration: number) => {
      setPage((prev) => ({
        ...prev,
        duration: newDuration,
        clips: [[0, newDuration, 0]],
      }))
    },
    [setPage],
  )

  const handleClipChange = useCallback(
    (clipIndex: number, field: 0 | 1, value: number) => {
      setPage((prev) => {
        const newClips = [...prev.clips]
        const newClip = [...newClips[clipIndex]] as [
          number,
          number,
          number,
          string?,
        ]
        newClip[field] = value
        newClips[clipIndex] = newClip
        return { ...prev, clips: newClips }
      })
    },
    [setPage],
  )

  const handleClipEpOffsetChange = useCallback(
    (clipIndex: number, value: number) => {
      setPage((prev) => {
        const newClips = [...prev.clips]
        const newClip = [...newClips[clipIndex]] as [
          number,
          number,
          number,
          string?,
        ]
        newClip[2] = value
        newClips[clipIndex] = newClip
        return { ...prev, clips: newClips }
      })
    },
    [setPage],
  )

  const handleAddClip = useCallback(() => {
    setPage((prev) => {
      const lastEnd =
        prev.clips.length > 0 ? prev.clips[prev.clips.length - 1][1] : 0
      return {
        ...prev,
        clips: [...prev.clips, [lastEnd, prev.duration, 0]],
      }
    })
  }, [setPage])

  const handleRemoveClip = useCallback(
    (clipIndex: number) => {
      setPage((prev) => ({
        ...prev,
        clips: prev.clips.filter((_, i) => i !== clipIndex),
      }))
    },
    [setPage],
  )

  const handleClipEpisodeChange = useCallback(
    (clipIndex: number, episodeId: string | null) => {
      setPage((prev) => {
        const newClips = [...prev.clips]
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
        return { ...prev, clips: newClips }
      })
    },
    [setPage],
  )

  return (
    <Accordion.Item id={String(page.cid)}>
      <Accordion.Heading>
        <Accordion.Trigger>
          P{page.page} - {page.part}
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <div className="space-y-3 p-4">
          <div className="font-mono text-xs text-muted">cid: {page.cid}</div>

          <NumberField
            value={page.duration}
            onChange={(v) => handleDurationChange(v)}
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
                    onPress={() => handleRemoveClip(clipIndex)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Label className="text-sm text-muted">抓取视频起止时间</Label>
                  <div className="flex flex-wrap items-end gap-2">
                    <ClipTimeInput
                      value={clip[0]}
                      onChange={(v) => handleClipChange(clipIndex, 0, v)}
                      isDisabled={isChecked}
                    />
                    <span className="text-sm text-muted">至</span>
                    <ClipTimeInput
                      value={clip[1]}
                      onChange={(v) => handleClipChange(clipIndex, 1, v)}
                      isDisabled={isChecked}
                    />
                  </div>
                  <Label className="text-sm text-muted">实际剧集进度偏移</Label>
                  <div className="flex flex-wrap items-end gap-2">
                    <ClipTimeInput
                      value={clip[2]}
                      onChange={(v) => handleClipEpOffsetChange(clipIndex, v)}
                      isDisabled={isChecked}
                    />
                    <span className="text-sm text-muted">至</span>
                    <ClipTimeInput
                      value={clip[2] + (clip[1] - clip[0])}
                      onChange={() => {}}
                      isDisabled
                    />
                  </div>
                  <Label className="text-sm text-muted">归属剧集</Label>
                  <Autocomplete
                    className="w-full sm:w-64"
                    selectionMode="single"
                    value={clip[3] ?? null}
                    onChange={(value) => {
                      const episodeId =
                        value && value !== '' ? String(value) : null
                      handleClipEpisodeChange(clipIndex, episodeId)
                      if (episodeId) {
                        const section = episodeTree.find((s) =>
                          s.episodes.some((ep) => ep.id === episodeId),
                        )
                        setEpisodeSearch(section?.season?.title || '')
                      }
                    }}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        ensureEpisodeTree()
                      }
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
                        <SearchField name="search" variant="secondary">
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
                              key={section.season?.id ?? '__default'}
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
              onPress={handleAddClip}
            >
              <Plus />
              添加片段
            </Button>
          </div>
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  )
})

export default function AddCapture({
  apiBaseUrl,
  onCaptureCreated,
}: {
  apiBaseUrl: string
  onCaptureCreated: () => void
}) {
  const [idType, setIdType] = useAtom(addCaptureIdTypeAtom)
  const [idInput, setIdInput] = useAtom(addCaptureIdInputAtom)
  const [isAdvancedMode, setIsAdvancedMode] = useAtom(
    addCaptureIsAdvancedModeAtom,
  )
  const [fastcapManual, setFastcapManual] = useAtom(addCaptureFastcapManualAtom)
  const [isFetchingPregen, setIsFetchingPregen] = useAtom(
    addCaptureIsFetchingPregenAtom,
  )
  const [pregenEdit, setPregenEdit] = useAtom(addCapturePregenEditAtom)
  const pageAtoms = useAtomValue(addCapturePregenPageAtomsAtom)
  const allClipsHaveEpisodeByPages = useAtomValue(
    addCaptureAllClipsHaveEpisodeAtom,
  )
  const clipBindingCount = useAtomValue(addCaptureClipBindingCountAtom)
  const [isCreatingCaptures, setIsCreatingCaptures] = useAtom(
    addCaptureIsCreatingCapturesAtom,
  )
  const [isChecked, setIsChecked] = useAtom(addCaptureIsCheckedAtom)
  const [hasFastcapPreset, setHasFastcapPreset] = useAtom(
    addCaptureHasFastcapPresetAtom,
  )
  const [creationProgress, setCreationProgress] = useAtom(
    addCaptureCreationProgressAtom,
  )
  const [isFastCapModalOpen, setIsFastCapModalOpen] = useAtom(
    addCaptureIsFastCapModalOpenAtom,
  )
  const [fastCapModalState, setFastCapModalState] = useAtom(
    addCaptureFastCapModalStateAtom,
  )
  const [fastCapModalContent, setFastCapModalContent] = useAtom(
    addCaptureFastCapModalContentAtom,
  )

  const [episodeTree, setEpisodeTree] = useAtom(addCaptureEpisodeTreeAtom)
  const [episodeTreeLoaded, setEpisodeTreeLoaded] = useAtom(
    addCaptureEpisodeTreeLoadedAtom,
  )
  const [episodeSearch, setEpisodeSearch] = useAtom(addCaptureEpisodeSearchAtom)
  const [, setLastCreatedCaptureAid] = useAtom(lastCreatedCaptureAidAtom)
  const { contains } = useFilter({ sensitivity: 'base' })
  const api = useMemo(() => createApiClient(apiBaseUrl), [apiBaseUrl])

  const fetchEpisodeTree = useCallback(async () => {
    try {
      const seasonsRes = await api(`api/seasons`)
      const seasons: Array<{ id: string; title: string | null }> = seasonsRes.ok
        ? await seasonsRes.json()
        : []

      const [defaultRes, ...seasonResults] = await Promise.all([
        api(`api/seasons/default/episodes`),
        ...seasons.map((s) => api(`api/seasons/${s.id}/episodes`)),
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
  }, [api])

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

    const manualFastcap = fastcapManual.trim()
    if (isAdvancedMode && !manualFastcap) {
      toast.warning('请输入 FastCap 配置')
      return
    }

    const type = String(idType)

    setIsFetchingPregen(true)
    try {
      const res = await api(
        `api/tasks/pregen/${type}/${encodeURIComponent(input)}`,
        isAdvancedMode && manualFastcap
          ? {
              method: 'POST',
              json: { fastcap_manual: manualFastcap },
            }
          : undefined,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as PregenResponse

      // 预加载剧集列表，确保 preset 里的 episodeId 能被 Autocomplete 正确映射显示。
      if (!episodeTreeLoaded) {
        setEpisodeTreeLoaded(true)
        await fetchEpisodeTree()
      }

      setHasFastcapPreset((data.preset?.length ?? 0) > 0)
      setPregenEdit(buildPregenEdit(data))
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
    setHasFastcapPreset(false)
    setIdInput('')
    setIsChecked(false)
    setIsAdvancedMode(false)
    setFastcapManual('')
  }

  const handleToggleAdvancedMode = () => {
    setIsAdvancedMode((prev) => !prev)
    setFastcapManual('')
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

  const handleOpenFastCapExport = async () => {
    if (!pregenEdit) return

    const pagesToExport = pregenEdit.pages

    if (pagesToExport.length === 0) {
      toast.warning('没有可导出的采集')
      return
    }

    if (!allClipsHaveEpisode) {
      toast.warning('请先为所有片段绑定剧集后再导出 FastCap')
      return
    }

    setIsFastCapModalOpen(true)
    setFastCapModalState('loading')
    setFastCapModalContent('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/tasks/captures/fastcap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          pagesToExport.map((page) => ({
            clips: page.clips,
            cid: page.cid,
            aid: pregenEdit.aid || undefined,
            pubdate: pregenEdit.pubdate || undefined,
            upMid: pregenEdit.upMid || undefined,
          })),
        ),
      })

      const text = await response.text()
      if (!response.ok) {
        throw new Error(text.trim() || `HTTP ${response.status}`)
      }

      setFastCapModalState('success')
      setFastCapModalContent(text.trim())
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      setFastCapModalState('error')
      setFastCapModalContent(errorMsg)
    }
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

        const createRes = await api(`api/tasks/captures/add`, {
          method: 'POST',
          json: {
            clips: page.clips,
            cid: page.cid,
            // 以下项若为 0 0n 或 '' 则不传，避免被后端当作无效值拒绝
            aid: pregenEdit.aid || undefined,
            pubdate: pregenEdit.pubdate || undefined,
            upMid: pregenEdit.upMid || undefined,
          },
        })
        if (!createRes.ok) {
          throw new Error(`P${page.page} 创建失败：HTTP ${createRes.status}`)
        }
      }

      // 保存最后创建的采集的 aid
      setLastCreatedCaptureAid(pregenEdit.aid)

      toast.success('采集创建完成')
      setPregenEdit(null)
      setHasFastcapPreset(false)
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

  const allClipsHaveEpisode = !!pregenEdit && allClipsHaveEpisodeByPages

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
            onChange={(value) => setIdType(value === 'cid' ? 'cid' : 'auto')}
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
              placeholder={`输入${idType === 'auto' ? 'aid / bvid / B站链接 (暂不支持合集、列表)' : 'cid'}`}
            />
          </TextField>

          <Button
            isPending={isFetchingPregen}
            isDisabled={isCreatingCaptures}
            onPress={() => void handleFetchPregen()}
          >
            查询
          </Button>

          <Button variant="secondary" onPress={handleToggleAdvancedMode}>
            高级
          </Button>
        </div>

        {isAdvancedMode && (
          <div className="mt-4 rounded border border-border p-4">
            <div className="mb-2 space-y-1">
              <div className="text-sm font-medium">高级查询</div>
              <div className="text-sm text-muted">
                在此手动填写 FastCap 配置，查询时会优先使用这里的内容。
              </div>
            </div>
            <TextArea
              value={fastcapManual}
              onChange={(e) => setFastcapManual(e.target.value)}
              placeholder="粘贴 FastCap 配置，需包含```fastcap <TOML内容> ```"
              rows={8}
              cols={30}
              variant="secondary"
              disabled={isFetchingPregen || isCreatingCaptures}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Pregen result */}
        {pregenEdit && (
          <div className="mt-4 space-y-4">
            <div className="space-y-3 rounded border border-border p-4">
              {hasFastcapPreset && (
                <Chip color="success" variant="soft" size="sm">
                  {!!fastcapManual || 'UP主'}
                  已为该视频配置FastCap标签，已自动解析并绑定已存在的剧集
                </Chip>
              )}

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
              {pageAtoms.map((pageAtom, index) => (
                <AddCapturePageItem
                  key={index}
                  pageAtom={pageAtom}
                  idType={idType}
                  isChecked={isChecked}
                  contains={contains}
                  episodeSearch={episodeSearch}
                  setEpisodeSearch={setEpisodeSearch}
                  episodeTree={episodeTree}
                  ensureEpisodeTree={ensureEpisodeTree}
                />
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
                variant="secondary"
                isDisabled={isCreatingCaptures || !allClipsHaveEpisode}
                onPress={() => void handleOpenFastCapExport()}
              >
                导出为 FastCap
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
                    ({clipBindingCount.bound}/{clipBindingCount.total})
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
        <FastCapModal
          isOpen={isFastCapModalOpen}
          onOpenChange={(open) => {
            setIsFastCapModalOpen(open)
            if (!open) {
              setFastCapModalState('idle')
              setFastCapModalContent('')
            }
          }}
          state={fastCapModalState}
          content={fastCapModalContent}
        />
      </Card.Content>
    </Card>
  )
}
