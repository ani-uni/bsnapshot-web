'use client'

import { Card, Link } from '@heroui/react'
import { useAtom } from 'jotai'
import { ArrowRight, WifiOff } from 'lucide-react'
import { isServerConnectedAtom } from '@/atoms/api'

interface RequireConnectionProps {
  children: React.ReactNode
}

/**
 * 需要 Server 连接的页面包装组件
 * 未连接时显示提示信息，连接后显示实际内容
 */
export function RequireConnection({ children }: RequireConnectionProps) {
  const [isServerConnected] = useAtom(isServerConnectedAtom)

  if (!isServerConnected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-2 border-dashed border-border">
          <Card.Content className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-danger/10">
              <WifiOff className="size-8 text-danger" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">未连接到服务器</h2>
            <p className="mb-6 text-muted">
              此页面需要连接到后端服务器才能使用
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-accent-foreground hover:bg-accent/90"
            >
              前往设置
              <ArrowRight className="size-4" />
            </Link>
          </Card.Content>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
