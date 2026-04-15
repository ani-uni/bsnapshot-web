import { atom } from 'jotai'

import type { FastCapModalState } from '@/components/FastCapModal'
import type { PregenEdit } from '@/app/tasks/types'

import type { EpisodeTreeSection } from '@/app/tasks/types'

export const addCaptureIdTypeAtom = atom<'auto' | 'cid'>('auto')
export const addCaptureIdInputAtom = atom('')
export const addCaptureIsAdvancedModeAtom = atom(false)
export const addCaptureFastcapManualAtom = atom('')
export const addCaptureIsFetchingPregenAtom = atom(false)
export const addCapturePregenEditAtom = atom<PregenEdit | null>(null)
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
