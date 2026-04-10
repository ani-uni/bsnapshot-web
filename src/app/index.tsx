import { Card, Surface, toast } from '@heroui/react'
import { useAtom } from 'jotai'
import { useEffect } from 'react'

import { checkUpdateAtom, lastUpdateCheckAtom } from '@/atoms/api'
import { RequireConnection } from '@/components/RequireConnection'
import fpkg from '~/package.json'

// import { QueueDisplay } from './QueueDisplay'
import { ServerInfo } from './ServerInfo'
import { UpdateCheckModal } from './UpdateCheckModal'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default function HomePage() {
  const [lastCheck] = useAtom(lastUpdateCheckAtom)
  const [, checkUpdate] = useAtom(checkUpdateAtom)

  useEffect(() => {
    const now = Date.now()
    // 如果距离上次检查超过 1 天或从未检查过，则自动检查
    if (now - lastCheck > ONE_DAY_MS) {
      checkUpdate('auto').catch((error) => {
        toast.danger(
          `自动检查更新失败：${error instanceof Error ? error.message : '未知错误'}`,
        )
      })
    }
  }, [lastCheck, checkUpdate])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">欢迎使用 BSnapshot</h1>

        <RequireConnection>
          {/* 版本更新检查 Modal */}
          <UpdateCheckModal />
          <ServerInfo />
          {/* <QueueDisplay /> */}
        </RequireConnection>

        <Card className="p-6">
          <Card.Header className="flex flex-col gap-2">
            <Card.Title>前端信息</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Surface variant="secondary" className="rounded-lg p-4">
                <p className="text-sm text-muted-foreground">前端版本</p>
                <p className="text-lg font-semibold text-foreground">
                  v{fpkg.version}
                </p>
              </Surface>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
