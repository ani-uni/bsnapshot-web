import { Button, Card, Spinner, Surface, Tooltip } from '@heroui/react'
import { useAtom } from 'jotai'
import { CheckCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'

import { checkUpdateAtom, serverInfoAtom, updateInfoAtom } from '@/atoms/api'

export function ServerInfo() {
  const [serverInfo] = useAtom(serverInfoAtom)
  const [updateInfo] = useAtom(updateInfoAtom)
  const [, checkUpdate] = useAtom(checkUpdateAtom)
  const [isChecking, setIsChecking] = useState(false)

  const handleCheckUpdate = useCallback(async () => {
    setIsChecking(true)
    try {
      await checkUpdate('manual')
    } finally {
      setIsChecking(false)
    }
  }, [checkUpdate])

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
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-xl font-bold tracking-tight text-foreground leading-none">
                    v{serverInfo.version}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border border-default-300 bg-default-100 px-2 py-1">
                      db:{serverInfo.dbVersion}
                    </span>
                    <span className="rounded-md border border-default-300 bg-default-100 px-2 py-1 tracking-wide">
                      {import.meta.env.VITE_IS_PACKED ? 'electron' : 'server'}
                    </span>
                  </div>
                  {/* 版本状态和检查按钮 */}
                  <div className="flex items-center gap-1 mt-2 w-full">
                    {updateInfo?.isLatest ? (
                      <span className="text-xs text-success bg-success/10 border border-success/30 rounded px-2 py-1">
                        已是最新
                      </span>
                    ) : updateInfo && !updateInfo.isLatest ? (
                      <span className="text-xs text-warning bg-warning/10 border border-warning/30 rounded px-2 py-1">
                        有可用更新
                      </span>
                    ) : null}
                    <Tooltip delay={0}>
                      <Button
                        isIconOnly
                        variant="tertiary"
                        className="ml-auto"
                        onClick={handleCheckUpdate}
                        isDisabled={isChecking}
                      >
                        <RefreshCw
                          className={`size-4 ${isChecking ? 'animate-spin' : ''}`}
                        />
                      </Button>
                      <Tooltip.Content>
                        <p>检查更新</p>
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
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
