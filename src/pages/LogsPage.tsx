import { Card } from '@heroui/react'
import { RequireConnection } from '@/components/RequireConnection'

export function LogsPage() {
  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold">日志</h1>
        <Card className="p-6">
          <Card.Content>
            <p className="text-muted">日志页面正在开发中...</p>
          </Card.Content>
        </Card>
      </div>
    </RequireConnection>
  )
}
