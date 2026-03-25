import type { Key } from '@heroui/react'
import type { LogEvent } from '@/atoms/events'

export type LogLevelFilter = 'all' | 'INFO' | 'WARNING' | 'ERROR'

export const LOG_LEVEL_OPTIONS: Array<{ id: LogLevelFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'INFO', label: 'INFO' },
  { id: 'WARNING', label: 'WARNING' },
  { id: 'ERROR', label: 'ERROR' },
]

export const LOG_STRING_FILTER_FIELD = {
  key: 'msg',
  label: '日志内容',
}

export function normalizeLevelFilter(value: Key | null | undefined): LogLevelFilter {
  if (value === 'INFO' || value === 'WARNING' || value === 'ERROR') {
    return value
  }
  return 'all'
}

export function getLogStyles(type?: string | null) {
  switch (type) {
    case 'ERROR':
      return {
        text: 'text-danger',
        chipColor: 'danger' as const,
      }
    case 'WARNING':
      return {
        text: 'text-warning',
        chipColor: 'warning' as const,
      }
    case 'INFO':
      return {
        text: 'text-accent',
        chipColor: 'accent' as const,
      }
    default:
      return {
        text: 'text-foreground',
        chipColor: 'default' as const,
      }
  }
}

export function filterEvents(
  events: LogEvent[],
  levelFilter: LogLevelFilter,
  contains: string,
): LogEvent[] {
  const normalizedContains = contains.trim().toLowerCase()

  return events.filter((event) => {
    if (levelFilter !== 'all' && event.type !== levelFilter) {
      return false
    }

    if (!normalizedContains) {
      return true
    }

    return event.msg.toLowerCase().includes(normalizedContains)
  })
}
