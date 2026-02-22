const WS_URL = 'ws://localhost:3000/ws'

type EventHandler = (data: any) => void

type SocketEvent = 
  | 'connected'
  | 'room_created'
  | 'session_invite'
  | 'session_started'
  | 'transcript'
  | 'error'
  | 'stopped'
  | 'ready'

class SocketManager {
  private socket: WebSocket | null = null
  private userId: string | null = null
  private eventHandlers: Map<SocketEvent, Set<EventHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.userId = userId
      const url = `${WS_URL}?userId=${encodeURIComponent(userId)}`

      try {
        this.socket = new WebSocket(url)
      } catch (error) {
        reject(error)
        return
      }

      this.socket.onopen = () => {
        console.log('[SocketManager] Connected')
        this.reconnectAttempts = 0
        resolve()
      }

      this.socket.onerror = (error) => {
        console.error('[SocketManager] Error:', error)
        reject(error)
      }

      this.socket.onclose = (event) => {
        console.log('[SocketManager] Closed:', event.code, event.reason)
        this.handleReconnect()
      }

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data)
      }
    })
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data)
      console.log('[SocketManager] Received:', message.type, message)

      const handlers = this.eventHandlers.get(message.type)
      if (handlers) {
        handlers.forEach(handler => handler(message))
      }
    } catch (error) {
      console.error('[SocketManager] Failed to parse message:', error)
    }
  }

  private handleReconnect() {
    if (!this.userId) return

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(`[SocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      
      setTimeout(() => {
        if (this.userId) {
          this.connect(this.userId).catch(console.error)
        }
      }, delay)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnecting')
      this.socket = null
    }
    this.userId = null
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
    console.log('[SocketManager] Disconnected')
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  send(message: object): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('[SocketManager] Cannot send - socket not connected')
      return false
    }

    this.socket.send(JSON.stringify(message))
    return true
  }

  on(event: SocketEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    
    this.eventHandlers.get(event)!.add(handler)

    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  off(event: SocketEvent, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  // Convenience methods for common actions

  respondToSessionInvite(accept: boolean): void {
    this.send({
      type: 'session_invite_response',
      accept
    })
  }

  startTranscription(sessionId: string): void {
    this.send({
      type: 'start',
      sessionId
    })
  }

  stopTranscription(sessionId: string): void {
    this.send({
      type: 'stop',
      sessionId
    })
  }
}

export const socketManager = new SocketManager()

export function initializeSocket(userId: string): Promise<void> {
  return socketManager.connect(userId)
}

export function closeSocket(): void {
  socketManager.disconnect()
}

export function onSocketEvent(event: SocketEvent, handler: EventHandler): () => void {
  return socketManager.on(event, handler)
}

export function sendSocketMessage(message: object): boolean {
  return socketManager.send(message)
}
