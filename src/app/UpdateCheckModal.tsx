import {
  Button,
  Card,
  Link,
  Modal,
  ScrollShadow,
  Separator,
} from '@heroui/react'
import { useAtom } from 'jotai'
import { ExternalLink } from 'lucide-react'
import { updateCheckModalOpenAtom, updateInfoAtom } from '@/atoms/api'

export function UpdateCheckModal() {
  const [updateInfo] = useAtom(updateInfoAtom)
  const [isOpen, setIsOpen] = useAtom(updateCheckModalOpenAtom)

  if (!updateInfo) {
    return null
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {updateInfo.isLatest
                  ? '已是最新版本'
                  : `发现新版本: ${updateInfo.release.name}`}
              </Modal.Heading>
            </Modal.Header>

            <Separator />

            <Modal.Body className="gap-4">
              {updateInfo.isLatest ? (
                <div className="space-y-2 py-4">
                  <p className="text-center text-sm text-muted-foreground">
                    您正在使用最新版本，无需更新。
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {/* 版本信息卡 */}
                  <Card className="bg-secondary/50">
                    <Card.Content className="space-y-2 py-3">
                      <div className="flex flex-col gap-1 text-sm">
                        <p className="text-muted-foreground">最新版本</p>
                        <p className="font-mono font-semibold text-foreground">
                          {updateInfo.release.tag}
                        </p>
                      </div>
                    </Card.Content>
                  </Card>

                  {/* 版本描述 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      更新说明
                    </p>
                    <ScrollShadow className="max-h-48 rounded-lg border border-border/60 bg-secondary/30 p-3">
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">
                        {updateInfo.release.description}
                      </p>
                    </ScrollShadow>
                  </div>
                </div>
              )}
            </Modal.Body>

            <Separator />

            <Modal.Footer>
              {!updateInfo.isLatest && (
                <>
                  {updateInfo.onlyWeb && (
                    <Button
                      onPress={() => {
                        globalThis.location.href = 'app:v0'
                      }}
                    >
                      尝试最新版本Web客户端
                    </Button>
                  )}
                  {updateInfo.dl_link && (
                    <Link
                      href={updateInfo.dl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium"
                    >
                      下载({updateInfo.platform})
                      <Link.Icon className="size-3" />
                    </Link>
                  )}
                  <Link
                    href={`https://github.com/${updateInfo.repo}/releases/latest`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium"
                  >
                    <ExternalLink className="size-4" />
                    查看 GitHub 发布页
                    <Link.Icon className="size-3" />
                  </Link>
                </>
              )}
              <Button variant="ghost" slot="close">
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
