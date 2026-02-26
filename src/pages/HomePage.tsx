import { Card, Spinner, Surface } from '@heroui/react'
import { useAtom } from 'jotai'
import { CheckCircle } from 'lucide-react'
import { isServerConnectedAtom, serverInfoAtom } from '@/atoms/api'
import { RequireConnection } from '@/components/RequireConnection'

export function HomePage() {
  const [isServerConnected] = useAtom(isServerConnectedAtom)
  const [serverInfo] = useAtom(serverInfoAtom)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">欢迎使用 BSnapshot</h1>

        {!isServerConnected ? (
          <RequireConnection> </RequireConnection>
        ) : !serverInfo ? (
          <div className="flex justify-center py-12">
            <Spinner color="current" />
          </div>
        ) : (
          <>
            <Card className="border-l-4 border-l-success bg-success/5">
              <Card.Content className="flex items-center gap-4 py-6">
                <CheckCircle className="size-6 text-success shrink-0" />
                <div>
                  <p className="text-sm text-muted">服务器连接状态</p>
                  <p className="text-lg font-semibold text-foreground">
                    已连接成功
                  </p>
                </div>
              </Card.Content>
            </Card>

            <Card className="p-6">
              <Card.Header className="flex flex-col gap-2">
                <Card.Title>服务器信息</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Surface variant="secondary" className="rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">应用名称</p>
                    <p className="text-lg font-semibold text-foreground">
                      {serverInfo.name}
                    </p>
                  </Surface>
                  <Surface variant="secondary" className="rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">应用版本</p>
                    <p className="text-lg font-semibold text-foreground">
                      {serverInfo.version}
                    </p>
                  </Surface>
                  <Surface variant="secondary" className="rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Nitro 版本</p>
                    <p className="text-lg font-semibold text-foreground">
                      {serverInfo.nitroVersion}
                    </p>
                  </Surface>
                </div>
              </Card.Content>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
