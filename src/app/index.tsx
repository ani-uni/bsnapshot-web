import { RequireConnection } from '@/components/RequireConnection'
import { QueueDisplay } from './QueueDisplay'
import { ServerInfo } from './ServerInfo'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">欢迎使用 BSnapshot</h1>

        <RequireConnection>
          <ServerInfo />
          <QueueDisplay />
        </RequireConnection>
      </div>
    </div>
  )
}
