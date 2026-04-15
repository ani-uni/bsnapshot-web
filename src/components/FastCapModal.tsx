import { Button, Modal, Spinner, toast } from '@heroui/react'
import clipboard from 'clipboardy'
import { Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

export type FastCapModalState = 'idle' | 'loading' | 'success' | 'error'

export interface FastCapModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  state: FastCapModalState
  content: string
}

function injectFastCapFenceToShikiHtml(html: string) {
  const opening = '<code>'
  const closing = '</code>'
  const codeStart = html.indexOf(opening)
  const codeEnd = html.lastIndexOf(closing)

  if (codeStart === -1 || codeEnd === -1 || codeEnd <= codeStart) {
    return html
  }

  const beforeCode = html.slice(0, codeStart + opening.length)
  const codeBody = html.slice(codeStart + opening.length, codeEnd)
  const afterCode = html.slice(codeEnd)

  const fenceStart = '<span class="line"><span>```fastcap</span></span><br />'
  const fenceEnd = '<br /><span class="line"><span>```</span></span>'

  return `${beforeCode}${fenceStart}${codeBody}${fenceEnd}${afterCode}`
}

export default function FastCapModal({
  isOpen,
  onOpenChange,
  state,
  content,
}: FastCapModalProps) {
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const [isHighlighting, setIsHighlighting] = useState(false)

  const handleCopy = async () => {
    if (state !== 'success') return
    const text = `\`\`\`fastcap\n${content}\n\`\`\``
    await clipboard
      .write(text)
      .then(() => {
        toast.success('已复制 FastCap 配置到剪贴板')
      })
      .catch((error) => {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        toast.danger(`复制失败：${errorMsg}`)
      })
  }

  useEffect(() => {
    if (state !== 'success' || !content) {
      setHighlightedHtml('')
      setIsHighlighting(false)
      return
    }

    let canceled = false
    setIsHighlighting(true)

    void (async () => {
      try {
        const html = await codeToHtml(content, {
          lang: 'toml',
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
        })
        if (!canceled) {
          setHighlightedHtml(injectFastCapFenceToShikiHtml(html))
        }
      } catch {
        if (!canceled) {
          setHighlightedHtml('')
        }
      } finally {
        if (!canceled) {
          setIsHighlighting(false)
        }
      }
    })()

    return () => {
      canceled = true
    }
  }, [content, state])

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>FastCap 配置</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3">
              {state === 'loading' && (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              )}
              {state === 'success' && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2 z-10"
                    onPress={() => void handleCopy()}
                  >
                    <Copy className="size-4" />
                    复制
                  </Button>
                  <div className="max-h-96 overflow-auto rounded border border-border bg-surface p-3 text-sm">
                    {highlightedHtml ? (
                      <div
                        className="[&_pre]:m-0! [&_pre]:rounded-none! [&_pre]:p-0! [&_pre]:text-sm! [&_pre]:font-mono!"
                        dangerouslySetInnerHTML={{
                          __html: highlightedHtml,
                        }}
                      />
                    ) : (
                      <pre className="font-mono whitespace-pre-wrap wrap-break-word">
                        {`\`\`\`fastcap\n${content}\n\`\`\``}
                      </pre>
                    )}
                    {isHighlighting && (
                      <div className="mt-2 text-xs text-muted">
                        正在进行语法高亮...
                      </div>
                    )}
                  </div>
                </div>
              )}
              {state === 'error' && (
                <p className="text-sm text-danger">{content}</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
