import { atom } from 'jotai'

export type LogEvent = {
  id: number
  ctime: string | Date
  type?: string | null
  msg: string
}

export const logEventsAtom = atom<LogEvent[]>([])
