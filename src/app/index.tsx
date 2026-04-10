import { toast } from '@heroui/react'
import { useAtom } from 'jotai'
import { useEffect } from 'react'

import { checkUpdateAtom, lastUpdateCheckAtom } from '@/atoms/api'
import { RequireConnection } from '@/components/RequireConnection'

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
          <ServerInfo />
          {/* <QueueDisplay /> */}
        </RequireConnection>
      </div>

      {/* 版本更新检查 Modal */}
      <UpdateCheckModal />
    </div>
  )
}
