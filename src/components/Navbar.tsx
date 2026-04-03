import { Button, Link, Tabs } from '@heroui/react'
import { useAtom } from 'jotai'
import { Menu, Monitor, Moon, Sun, Wifi, WifiOff, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { isServerConnectedAtom, serverInfoAtom } from '@/atoms/api'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/tasks', label: '任务' },
  { href: '/groups', label: '合集' },
  { href: '/users', label: '用户' },
  { href: '/settings', label: '设置' },
  { href: '/logs', label: '日志' },
  { href: '/about', label: '关于' },
]

export function Navbar() {
  const { themeMode, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isServerConnected] = useAtom(isServerConnectedAtom)
  const [serverInfo] = useAtom(serverInfoAtom)
  const location = useLocation()
  const navigate = useNavigate()

  const filteredNavItems = navItems.filter((item) => {
    // 未连接时，只显示首页、关于和设置
    if (!isServerConnected) {
      return item.href === '/' || item.href === '/settings' || item.href === '/about'
    }
    if (!serverInfo?.userExist) {
      return !(item.href === '/tasks')
    }
    return true
  })

  const matchedRoute = filteredNavItems.find((item) =>
    item.href === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.href),
  )

  return (
    <nav className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur">
      <div className="relative mx-auto flex flex-col max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="text-xl font-bold no-underline">
              BSnapshot
            </Link>
          </div>

          {/* Right side - Server status + Theme toggle */}
          <div className="flex items-center gap-4">
            {/* Server Connection Status */}
            <div
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
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
              <span>{isServerConnected ? '已连接' : '未连接'}</span>
            </div>

            {/* Theme Switch */}
            <Tabs
              selectedKey={themeMode}
              onSelectionChange={(key) =>
                setTheme(key as 'light' | 'dark' | 'system')
              }
              className="hidden sm:flex"
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="主题设置">
                  <Tabs.Tab id="light">
                    <Sun className="size-4" />
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="dark">
                    <Moon className="size-4" />
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="system">
                    <Monitor className="size-4" />
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>

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

        {/* Desktop Menu */}
        <div className="hidden md:flex">
          <Tabs selectedKey={matchedRoute?.href ?? '/'} variant="secondary">
            <Tabs.ListContainer>
              <Tabs.List aria-label="页面导航" className="*:min-w-20 *:px-4">
                {filteredNavItems.map((item) => (
                  <Tabs.Tab
                    key={item.href}
                    id={item.href}
                    onPress={() => navigate(item.href)}
                  >
                    {item.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full border-t border-border bg-surface py-4 shadow-lg md:hidden">
            <div className="px-3">
              <Tabs
                selectedKey={matchedRoute?.href ?? '/'}
                variant="secondary"
                orientation="vertical"
              >
                <Tabs.ListContainer>
                  <Tabs.List aria-label="页面导航">
                    {filteredNavItems.map((item) => (
                      <Tabs.Tab
                        key={item.href}
                        id={item.href}
                        onPress={() => {
                          navigate(item.href)
                          setIsOpen(false)
                        }}
                      >
                        {item.label}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
              {/* Mobile Theme Toggle */}
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                  主题设置
                </p>
                <div className="px-3">
                  <Tabs
                    selectedKey={themeMode}
                    onSelectionChange={(key) =>
                      setTheme(key as 'light' | 'dark' | 'system')
                    }
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label="主题设置" className="*:gap-1.5">
                        <Tabs.Tab id="light">
                          <Sun className="size-4" />
                          日间
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="dark">
                          <Moon className="size-4" />
                          夜间
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="system">
                          <Monitor className="size-4" />
                          跟随系统
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
