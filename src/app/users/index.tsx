import { Button, Card, Modal, TextArea, toast } from '@heroui/react'
import QRCode from 'easyqrcodejs'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  CheckCircle2,
  LogIn,
  QrCode,
  RefreshCcw,
  UserCircle2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiBaseUrlAtom } from '@/atoms/api'
import {
  loginStatusAtom,
  loginWithCookiesAtom,
  usersAtom,
  usersRefreshAtom,
} from '@/atoms/users'
import { RequireConnection } from '@/components/RequireConnection'

export default function UsersPage() {
  const users = useAtomValue(usersAtom)
  const refresh = useSetAtom(usersRefreshAtom)
  const [, loginWithCookies] = useAtom(loginWithCookiesAtom)
  const loginStatus = useAtomValue(loginStatusAtom)
  const apiBaseUrl = useAtomValue(apiBaseUrlAtom)

  const [cookiesInput, setCookiesInput] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrMsg, setQrMsg] = useState<string | null>(null)
  const [qrErr, setQrErr] = useState<string | null>(null)
  const [isQrConnecting, setIsQrConnecting] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement | null>(null)
  const qrSocketRef = useRef<WebSocket | null>(null)

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

  useEffect(() => {
    if (!qrUrl || !qrContainerRef.current) return

    qrContainerRef.current.innerHTML = ''
    // Render QR code for scan login
    // eslint-disable-next-line no-new
    new QRCode(qrContainerRef.current, {
      text: qrUrl,
      width: 220,
      height: 220,
    })
  }, [qrUrl])

  useEffect(() => {
    if (!isQrModalOpen) {
      qrSocketRef.current?.close()
      qrSocketRef.current = null
      setQrUrl(null)
      setQrMsg(null)
      setQrErr(null)
      setIsQrConnecting(false)
      return
    }

    setIsQrConnecting(true)
    setQrUrl(null)
    setQrMsg(null)
    setQrErr(null)

    let ws: WebSocket | null = null

    try {
      const base = new URL(apiBaseUrl)
      const wsUrl = new URL('/api/auth/users/login/qrcode', base)
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

      ws = new WebSocket(wsUrl.toString())
      qrSocketRef.current = ws

      ws.addEventListener('message', (event) => {
        let data: unknown = event.data
        try {
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data)
          }
        } catch {
          return
        }

        const payload = data as {
          gen?: { qrcode_key: string; qrcode_url: string }
          msg?: string
          err?: string
          user?: { mid: string; uname: string; vip: boolean }
        }

        if (payload.gen?.qrcode_url) {
          setQrUrl(payload.gen.qrcode_url)
          setIsQrConnecting(false)
          return
        }

        if (payload.msg) {
          setQrMsg(payload.msg)
          return
        }

        if (payload.err) {
          setQrErr(payload.err)
          setIsQrConnecting(false)
          ws?.close()
          return
        }

        if (payload.user) {
          setIsQrConnecting(false)
          toast.success('扫码登录成功')
          refresh((prev) => prev + 1)
          setIsQrModalOpen(false)
        }
      })

      ws.addEventListener('error', () => {
        setQrErr('二维码登录连接失败')
        setIsQrConnecting(false)
      })

      ws.addEventListener('close', () => {
        if (isQrModalOpen && !qrErr) {
          setIsQrConnecting(false)
        }
      })
    } catch (error) {
      setQrErr(error instanceof Error ? error.message : '二维码登录连接失败')
      setIsQrConnecting(false)
    }

    return () => {
      ws?.close()
    }
  }, [apiBaseUrl, isQrModalOpen, refresh, qrErr])

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
              <RefreshCcw />
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
              <LogIn />
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

          <Modal>
            <Button
              className="flex items-center gap-2"
              variant="secondary"
              onPress={() => setIsQrModalOpen(true)}
            >
              <QrCode />
              扫码登录
            </Button>
            <Modal.Backdrop
              isOpen={isQrModalOpen}
              onOpenChange={setIsQrModalOpen}
            >
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-md">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>扫码登录</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="gap-4">
                    <p className="text-sm text-muted">
                      使用 B 站 App 扫描二维码进行登录。
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        ref={qrContainerRef}
                        className="flex h-60 w-60 items-center justify-center rounded-lg border border-border"
                      >
                        {!qrUrl && (
                          <span className="text-sm text-muted">
                            {isQrConnecting
                              ? '正在生成二维码...'
                              : '等待二维码'}
                          </span>
                        )}
                      </div>
                      {qrMsg && (
                        <div className="w-full rounded-lg bg-warning/10 p-3 text-warning">
                          <p className="text-sm">{qrMsg}</p>
                        </div>
                      )}
                      {qrErr && (
                        <div className="w-full rounded-lg bg-danger/10 p-3 text-danger">
                          <p className="text-sm">{qrErr}</p>
                        </div>
                      )}
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close" variant="secondary">
                      关闭
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
