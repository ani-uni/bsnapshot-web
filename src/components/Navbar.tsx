'use client'

import { Button, Label, Link, Switch } from '@heroui/react'
import { Menu, Moon, Sun, X, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useAtom } from 'jotai'
import { isServerConnectedAtom } from '@/atoms/api'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/settings', label: '设置' },
  { href: '/users', label: '用户管理' },
  { href: '/tasks', label: '任务' },
  { href: '/groups', label: '组管理' },
  { href: '/logs', label: '日志' },
]

export function Navbar() {
  const { isDark, toggleTheme } = useTheme()
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
            <div className="hidden items-center gap-2 sm:flex">
              <Switch
                aria-label="Toggle dark mode"
                isSelected={isDark}
                onChange={toggleTheme}
                size="sm"
              >
                <Switch.Control>
                  <Switch.Thumb>
                    <Switch.Icon>
                      {isDark ? (
                        <Moon className="size-3" />
                      ) : (
                        <Sun className="size-3" />
                      )}
                    </Switch.Icon>
                  </Switch.Thumb>
                </Switch.Control>
              </Switch>
            </div>

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
              {/* Mobile Server Status */}
              <div className="border-t border-border pt-4">
                <div
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isServerConnected
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {isServerConnected ? (
                    <Wifi className="size-4" />
                  ) : (
                    <WifiOff className="size-4" />
                  )}
                  <span>Server {isServerConnected ? '已连接' : '未连接'}</span>
                </div>
              </div>
              {/* Mobile Theme Toggle */}
              <div className="border-t border-border pt-4">
                <Switch
                  aria-label="Toggle dark mode"
                  isSelected={isDark}
                  onChange={toggleTheme}
                  size="sm"
                >
                  <Switch.Control>
                    <Switch.Thumb>
                      <Switch.Icon>
                        {isDark ? (
                          <Moon className="size-3" />
                        ) : (
                          <Sun className="size-3" />
                        )}
                      </Switch.Icon>
                    </Switch.Thumb>
                  </Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">
                      {isDark ? '暗色模式' : '亮色模式'}
                    </Label>
                  </Switch.Content>
                </Switch>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
