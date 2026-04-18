import { atom } from 'jotai'
import { splitAtom, atomWithStorage } from 'jotai/utils'

import type { PageEdit, PregenEdit } from '@/app/tasks/types'
import type { EpisodeTreeSection } from '@/app/tasks/types'
import type { FastCapModalState } from '@/components/FastCapModal'

export const addCaptureIdTypeAtom = atom<'auto' | 'cid'>('auto')
export const addCaptureIdInputAtom = atom('')
export const addCaptureIsAdvancedModeAtom = atom(false)
export const addCaptureFastcapManualAtom = atom('')
export const addCaptureIsFetchingPregenAtom = atom(false)

const addCapturePregenMetaAtom = atom<Omit<PregenEdit, 'pages'> | null>(null)
const addCapturePregenPagesAtom = atom<PageEdit[]>([])

export const addCapturePregenPageAtomsAtom = splitAtom(
  addCapturePregenPagesAtom,
)

export const addCapturePregenEditAtom = atom(
  (get) => {
    const meta = get(addCapturePregenMetaAtom)
    if (!meta) return null
    return {
      ...meta,
      pages: get(addCapturePregenPagesAtom),
    }
  },
  (
    get,
    set,
    update:
      | PregenEdit
      | null
      | ((prev: PregenEdit | null) => PregenEdit | null),
  ) => {
    const meta = get(addCapturePregenMetaAtom)
    const prev = meta
      ? {
          ...meta,
          pages: get(addCapturePregenPagesAtom),
        }
      : null

    const next =
      typeof update === 'function'
        ? (update as (prev: PregenEdit | null) => PregenEdit | null)(prev)
        : update

    if (!next) {
      set(addCapturePregenMetaAtom, null)
      set(addCapturePregenPagesAtom, [])
      return
    }

    const { pages, ...nextMeta } = next
    set(addCapturePregenMetaAtom, nextMeta)
    set(addCapturePregenPagesAtom, pages)
  },
)

export const addCaptureAllClipsHaveEpisodeAtom = atom((get) => {
  const pages = get(addCapturePregenPagesAtom)
  return pages.every(
    (page) => page.clips.length === 0 || page.clips.every((clip) => !!clip[3]),
  )
})

export const addCaptureClipBindingCountAtom = atom((get) => {
  const pages = get(addCapturePregenPagesAtom)
  return {
    bound: pages.filter((p) => p.clips.some((c) => c[3])).length,
    total: pages.filter((p) => p.clips.length > 0).length,
  }
})

export const addCaptureIsCreatingCapturesAtom = atom(false)
export const addCaptureIsCheckedAtom = atom(false)
export const addCaptureHasFastcapPresetAtom = atom(false)
export const addCaptureCreationProgressAtom = atom<{
  current: number
  total: number
} | null>(null)
export const addCaptureIsFastCapModalOpenAtom = atom(false)
export const addCaptureFastCapModalStateAtom = atom<FastCapModalState>('idle')
export const addCaptureFastCapModalContentAtom = atom('')
export const addCaptureEpisodeTreeAtom = atom<EpisodeTreeSection[]>([])
export const addCaptureEpisodeTreeLoadedAtom = atom(false)
export const addCaptureEpisodeSearchAtom = atom('')

// 存储最后创建的采集对应的 aid，用于高亮显示
export const lastCreatedCaptureAidAtom = atomWithStorage<string | null>(
  'lastCreatedCaptureAid',
  null,
)
