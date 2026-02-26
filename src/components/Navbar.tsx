'use client'

import { Button, ButtonGroup, Link } from '@heroui/react'
import { useAtom } from 'jotai'
import { Menu, Monitor, Moon, Sun, Wifi, WifiOff, X } from 'lucide-react'
import { useState } from 'react'
import { isServerConnectedAtom } from '@/atoms/api'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/settings', label: '设置' },
  { href: '/users', label: '用户管理' },
  { href: '/tasks', label: '任务' },
  { href: '/groups', label: '组管理' },
  { href: '/logs', label: '日志' },
]

export function Navbar() {
  const { themeMode, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isServerConnected] = useAtom(isServerConnectedAtom)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="text-xl font-bold no-underline">
              BSnapshot
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {navItems
              .filter((item) => {
                // 未连接时，只显示首页和设置
                if (!isServerConnected) {
                  return item.href === '/' || item.href === '/settings'
                }
                return true
              })
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium transition-colors no-underline hover:bg-surface-hover"
                >
                  {item.label}
                </Link>
              ))}
          </div>

          {/* Right side - Server status + Theme toggle */}
          <div className="flex items-center gap-4">
            {/* Server Connection Status */}
            <div
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium md:hidden ${
                isServerConnected
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
              title={isServerConnected ? 'Server 已连接' : 'Server 未连接'}
            >
              {isServerConnected ? (
                <Wifi className="size-3.5" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
            </div>

            {/* Server Connection Status - Desktop only */}
            <div
              className={`hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium sm:flex ${
                isServerConnected
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
              title={isServerConnected ? 'Server 已连接' : 'Server 未连接'}
            >
              {isServerConnected ? (
                <Wifi className="size-3.5" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              <span className="hidden lg:inline">
                {isServerConnected ? '已连接' : '未连接'}
              </span>
            </div>

            {/* Theme Switch */}
            <ButtonGroup size="sm" variant="outline" className="hidden sm:flex">
              <Button
                isIconOnly
                onPress={() => setTheme('light')}
                aria-label="切换到日间模式"
                variant={themeMode === 'light' ? 'secondary' : 'tertiary'}
              >
                <Sun className="size-4" />
              </Button>
              <Button
                isIconOnly
                onPress={() => setTheme('dark')}
                aria-label="切换到夜间模式"
                variant={themeMode === 'dark' ? 'secondary' : 'tertiary'}
              >
                <Moon className="size-4" />
              </Button>
              <Button
                isIconOnly
                onPress={() => setTheme('system')}
                aria-label="跟随系统"
                variant={themeMode === 'system' ? 'secondary' : 'tertiary'}
              >
                <Monitor className="size-4" />
              </Button>
            </ButtonGroup>

            {/* Mobile Menu Button */}
            <Button
              isIconOnly
              variant="ghost"
              className="md:hidden"
              onPress={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="border-t border-border bg-surface py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems
                .filter((item) => {
                  // 未连接时，只显示首页和设置
                  if (!isServerConnected) {
                    return item.href === '/' || item.href === '/settings'
                  }
                  return true
                })
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-sm font-medium transition-colors no-underline hover:bg-surface-hover"
                    onPress={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              {/* Mobile Theme Toggle */}
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                  主题设置
                </p>
                <div className="px-3">
                  <ButtonGroup fullWidth size="sm">
                    <Button
                      onPress={() => setTheme('light')}
                      variant={themeMode === 'light' ? 'secondary' : 'tertiary'}
                    >
                      <Sun className="size-4" />
                      日间
                    </Button>
                    <Button
                      onPress={() => setTheme('dark')}
                      variant={themeMode === 'dark' ? 'secondary' : 'tertiary'}
                    >
                      <Moon className="size-4" />
                      夜间
                    </Button>
                    <Button
                      onPress={() => setTheme('system')}
                      variant={
                        themeMode === 'system' ? 'secondary' : 'tertiary'
                      }
                    >
                      <Monitor className="size-4" />
                      系统
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
