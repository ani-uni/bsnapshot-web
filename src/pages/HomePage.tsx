import { Card } from '@heroui/react'

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">欢迎使用 BSnapshot</h1>
        <p className="text-lg text-muted">
          这是一个使用 HeroUI v3
          搭建的现代化应用框架，包含导航栏和自动夜间模式支持。
        </p>

        <Card className="p-6">
          <Card.Header className="flex flex-col gap-2">
            <Card.Title>功能特性</Card.Title>
          </Card.Header>
          <Card.Content className="px-0 py-0">
            <ul className="space-y-2 text-muted">
              <li>✨ 响应式导航栏设计</li>
              <li>🌙 自动检测系统深色模式偏好</li>
              <li>🎨 HeroUI v3 组件库</li>
              <li>📱 移动设备友好的界面</li>
              <li>🚀 Vite + React + TypeScript</li>
              <li>🎯 Tailwind CSS v4 样式系统</li>
            </ul>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
