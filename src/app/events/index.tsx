import { RequireConnection } from '@/components/RequireConnection'

import LogEventsPanel from './module/LogEventsPanel'

export default function LogsPage() {
  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold">日志</h1>
        </div>
        <LogEventsPanel showClearButton showReloadAllButton />
      </div>
    </RequireConnection>
  )
}
