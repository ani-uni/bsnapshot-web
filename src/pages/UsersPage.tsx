import { Button, Card, Modal, TextArea, toast } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { CheckCircle2, LogIn, RefreshCcw, UserCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  loginStatusAtom,
  loginWithCookiesAtom,
  usersAtom,
  usersRefreshAtom,
} from '@/atoms/users'
import { RequireConnection } from '@/components/RequireConnection'

export function UsersPage() {
  const users = useAtomValue(usersAtom)
  const refresh = useSetAtom(usersRefreshAtom)
  const [, loginWithCookies] = useAtom(loginWithCookiesAtom)
  const loginStatus = useAtomValue(loginStatusAtom)

  const [cookiesInput, setCookiesInput] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const handleRefresh = () => {
    refresh((prev) => prev + 1)
  }

  const handleLoginClick = async () => {
    if (!cookiesInput.trim()) return

    setIsLoggingIn(true)
    try {
      await loginWithCookies(cookiesInput)
      setCookiesInput('')
      setIsLoginModalOpen(false)
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // 监听登录状态并显示 toast
  useEffect(() => {
    if (loginStatus.status === 'success') {
      toast.success('登录成功')
    } else if (loginStatus.status === 'error') {
      toast.danger(loginStatus.message || '登录失败')
    }
  }, [loginStatus.status, loginStatus.message])

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold">用户管理</h1>
          <div className="flex gap-2">
            <Button
              onPress={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCcw className="size-4" />
              刷新
            </Button>
          </div>
        </div>

        {/* 登录按钮区域 */}
        <div className="mb-8 flex gap-3">
          <Modal>
            <Button
              className="flex items-center gap-2"
              variant="primary"
              onPress={() => setIsLoginModalOpen(true)}
            >
              <LogIn className="size-4" />
              通过 Cookies 登录
            </Button>
            <Modal.Backdrop
              isOpen={isLoginModalOpen}
              onOpenChange={setIsLoginModalOpen}
            >
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-md">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>通过 Cookies 登录</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="gap-4">
                    <p className="text-sm text-muted">
                      粘贴你的 B 站
                      Cookies（bauth_cookies）。通常可以从浏览器开发者工具的
                      Network 标签中找到。
                    </p>
                    <TextArea
                      placeholder="粘贴 cookies 内容..."
                      rows={6}
                      value={cookiesInput}
                      onChange={(e) => setCookiesInput(e.target.value)}
                      disabled={isLoggingIn}
                      className="font-mono text-sm"
                    />
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      slot="close"
                      variant="secondary"
                      isDisabled={isLoggingIn}
                    >
                      取消
                    </Button>
                    <Button
                      onPress={handleLoginClick}
                      isDisabled={isLoggingIn || !cookiesInput.trim()}
                      variant="primary"
                    >
                      {isLoggingIn ? '登录中...' : '登录'}
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>

        {/* 用户列表 */}
        {users === null ? (
          <Card className="p-6">
            <Card.Content>
              <p className="text-muted">加载中...</p>
            </Card.Content>
          </Card>
        ) : users.length === 0 ? (
          <Card className="p-6">
            <Card.Content>
              <p className="text-muted">暂无已登录用户</p>
            </Card.Content>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.mid} className="p-4">
                <Card.Content>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <UserCircle2 className="size-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.uname}</h3>
                        {user.vip && (
                          <CheckCircle2 className="size-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted">UID: {user.mid}</p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RequireConnection>
  )
}
