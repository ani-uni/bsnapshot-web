import { Button, Card, Spinner, Surface } from '@heroui/react'
import { useAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, WifiOff } from 'lucide-react'
import { isServerConnectedAtom, serverInfoAtom } from '@/atoms/api'

export function HomePage() {
  const [isServerConnected] = useAtom(isServerConnectedAtom)
  const [serverInfo] = useAtom(serverInfoAtom)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">欢迎使用 BSnapshot</h1>

        {!isServerConnected ? (
          <Card className="border-2 border-dashed border-border">
            <Card.Content className="py-16 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-danger/10">
                <WifiOff className="size-8 text-danger" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">未连接到服务器</h2>
              <p className="mb-6 text-muted">
                此页面需要连接到后端服务器才能使用
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate('/settings')}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-accent-foreground hover:bg-accent/90"
                >
                  前往设置
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card.Content>
          </Card>
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
