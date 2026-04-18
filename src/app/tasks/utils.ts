import { Duration } from 'luxon'

import { formatSn } from '@/app/groups/sn'

import type { SeasonEpisodeItem } from './types'

export function secondsToHms(totalSeconds: number): string {
  return Duration.fromMillis(totalSeconds * 1000).toFormat('hh:mm:ss')
}

export function hmsToSeconds(hms: string): number | null {
  const d = Duration.fromISOTime(hms)
  if (!d.isValid) return null
  return d.as('seconds')
}

export function detectIdType(input: string): 'aid' | 'bvid' {
  if (input.startsWith('BV')) return 'bvid'
  return 'aid'
}

export function episodeLabel(ep: SeasonEpisodeItem): string {
  const title = ep.title || '未命名'
  if (ep.sn !== null) {
    const snDisplay = formatSn(ep.sn)
    return snDisplay ? `${snDisplay} - ${title}` : title
  }
  return title
}
