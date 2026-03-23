import { Card, Spinner, Surface } from '@heroui/react'
import { useAtom } from 'jotai'
import { CheckCircle, TriangleAlert } from 'lucide-react'
import { serverInfoAtom } from '@/atoms/api'

export function ServerInfo() {
  const [serverInfo] = useAtom(serverInfoAtom)

  if (serverInfo)
    return (
      <>
        <Card
          className={`border-l-4 ${serverInfo.userExist ? 'border-l-success bg-success/5' : 'border-l-warning bg-warning/25'}`}
        >
          <Card.Content className="flex text-center items-center gap-4 py-6">
            {serverInfo.userExist ? (
              <CheckCircle className="size-6 text-success shrink-0" />
            ) : (
              <TriangleAlert className="size-6 text-warning shrink-0" />
            )}
            <p className="text-lg font-semibold text-foreground">
              {serverInfo.userExist ? '服务器已成功连接' : '当前无已登录用户'}
            </p>
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
    )
  else
    return (
      <div className="flex justify-center py-12">
        <Spinner color="current" />
      </div>
    )
}
