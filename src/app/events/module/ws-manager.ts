import type { LogEvent } from '@/atoms/events'

type EventWsCmd =
  | { cmd: 'ping' }
  | { cmd: 'list'; after?: number }
  | { cmd: 'toggle-auto-refresh' }

type EventWsListener = {
  getAfter: () => number
  onEvents: (events: LogEvent[]) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (message: string) => void
  onAutoRefreshChange?: (enabled: boolean) => void
}

type ListenerEntry = EventWsListener & { id: number }

let socket: WebSocket | null = null
let socketUrl = ''
let listenerSeq = 0
let autoRefreshEnabled = false
const listeners = new Map<number, ListenerEntry>()

function notifyOpen() {
  for (const listener of listeners.values()) {
    listener.onOpen?.()
  }
}

function notifyClose() {
  for (const listener of listeners.values()) {
    listener.onClose?.()
  }
}

function notifyError(message: string) {
  for (const listener of listeners.values()) {
    listener.onError?.(message)
  }
}

function notifyEvents(events: LogEvent[]) {
  for (const listener of listeners.values()) {
    listener.onEvents(events)
  }
}

function notifyAutoRefresh(enabled: boolean) {
  for (const listener of listeners.values()) {
    listener.onAutoRefreshChange?.(enabled)
  }
}

function getMaxAfter(): number {
  let maxAfter = 0

  for (const listener of listeners.values()) {
    const after = listener.getAfter()
    if (after > maxAfter) {
      maxAfter = after
    }
  }

  return maxAfter
}

function sendRaw(cmd: EventWsCmd): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false
  }

  socket.send(JSON.stringify(cmd))
  return true
}

export function sendEventWsCmd(
  cmd: EventWsCmd,
  options?: { forceFullList?: boolean },
): boolean {
  if (cmd.cmd === 'list') {
    if (options?.forceFullList) {
      return sendRaw({ cmd: 'list' })
    }

    if (typeof cmd.after === 'number') {
      return sendRaw(cmd)
    }

    return sendRaw({ cmd: 'list', after: getMaxAfter() })
  }

  return sendRaw(cmd)
}

export function setEventWsAutoRefresh(next: boolean): boolean {
  if (autoRefreshEnabled === next) {
    notifyAutoRefresh(next)
    return true
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false
  }

  const sent = sendRaw({ cmd: 'toggle-auto-refresh' })
  if (!sent) {
    return false
  }

  autoRefreshEnabled = next
  notifyAutoRefresh(next)
  return true
}

function connect(url: string) {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return
  }

  autoRefreshEnabled = false
  const ws = new WebSocket(url)
  socket = ws

  ws.addEventListener('open', () => {
    if (socket !== ws) return
    notifyOpen()
    void sendEventWsCmd({ cmd: 'list' })
    void setEventWsAutoRefresh(true)
  })

  ws.addEventListener('message', (event) => {
    if (socket !== ws) return

    let data: unknown = event.data
    try {
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data)
      }
    } catch {
      return
    }

    if (data && typeof data === 'object') {
      const response = data as {
        success?: boolean
        error?: string
        events?: LogEvent[]
      }

      if (response.success === false || response.error) {
        notifyError(response.error || '服务器返回错误')
        return
      }

      if (Array.isArray(response.events)) {
        notifyEvents(response.events)
        return
      }
    }

    if (Array.isArray(data)) {
      notifyEvents(data as LogEvent[])
    }
  })

  ws.addEventListener('error', () => {
    if (socket !== ws) return
    notifyError('日志连接失败')
  })

  ws.addEventListener('close', () => {
    if (socket !== ws) return
    socket = null
    autoRefreshEnabled = false
    notifyAutoRefresh(false)
    notifyClose()

    // 仍有实例时自动重连
    if (listeners.size > 0 && socketUrl) {
      connect(socketUrl)
    }
  })
}

export function acquireEventWs(
  url: string,
  listener: EventWsListener,
): () => void {
  listenerSeq += 1
  const entry: ListenerEntry = {
    id: listenerSeq,
    ...listener,
  }

  listeners.set(entry.id, entry)

  if (socketUrl && socketUrl !== url && socket) {
    socket.close()
    socket = null
  }

  socketUrl = url
  connect(url)

  if (socket?.readyState === WebSocket.OPEN) {
    entry.onOpen?.()
    entry.onAutoRefreshChange?.(autoRefreshEnabled)
  }

  return () => {
    listeners.delete(entry.id)

    if (listeners.size === 0) {
      if (socket) {
        socket.close()
      }
      socket = null
      socketUrl = ''
      autoRefreshEnabled = false
    }
  }
}
