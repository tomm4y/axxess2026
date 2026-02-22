type Unsubscribe = () => void

type SessionInviteEvent = {
  type: 'session_invite'
  roomId: string
  creatorId: string
}

type RoomCreatedEvent = {
  type: 'room_created'
  roomId: string
  clinicianId?: string
  patientId?: string
}

type SessionStartedEvent = {
  type: 'session_started'
  sessionId: string
  roomId: string
}

type TranscriptEvent = {
  type: 'transcript'
  payload: {
    startMs: number
    endMs: number
    speakerId: string | null
    role: 'Doctor' | 'Patient' | null
    text: string
    isFinal: boolean
    confidence?: number
  }
}

type ErrorEvent = {
  type: 'error'
  message: string
  details?: unknown
}

type StoppedEvent = {
  type: 'stopped'
  finalTranscriptSummary: {
    sessionId: string
    segmentCount: number
  }
}

type ReadyEvent = {
  type: 'ready'
}

type UtteranceEvent = {
  type: 'utterance'
  payload: {
    startMs: number
    endMs: number
    speakerId: string | null
    role: 'Doctor' | 'Patient' | null
    text: string
    isFinal: boolean
  }
}

type ConnectedEvent = {
  type: 'connected'
  userId: string
}

type ServerMessage =
  | SessionInviteEvent
  | RoomCreatedEvent
  | SessionStartedEvent
  | TranscriptEvent
  | ErrorEvent
  | StoppedEvent
  | ReadyEvent
  | UtteranceEvent
  | ConnectedEvent

type Handler<T> = (event: T) => void

export class EventSocket {
  private ws: WebSocket | null = null
  private userId: string | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isIntentionalClose = false

  private handlers = {
    session_invite: new Set<Handler<SessionInviteEvent>>(),
    room_created: new Set<Handler<RoomCreatedEvent>>(),
    session_started: new Set<Handler<SessionStartedEvent>>(),
    transcript: new Set<Handler<TranscriptEvent>>(),
    error: new Set<Handler<ErrorEvent>>(),
    stopped: new Set<Handler<StoppedEvent>>(),
    ready: new Set<Handler<ReadyEvent>>(),
    utterance: new Set<Handler<UtteranceEvent>>(),
    connected: new Set<Handler<ConnectedEvent>>(),
  }

  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = 3000
    return `${protocol}//${host}:${port}/ws`
  }

  open(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.userId = userId
      this.isIntentionalClose = false
      const url = `${this.getWsUrl()}?userId=${encodeURIComponent(userId)}`

      try {
        this.ws = new WebSocket(url)
      } catch (error) {
        reject(error)
        return
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        resolve()
      }

      this.ws.onerror = (error) => {
        reject(error)
      }

      this.ws.onclose = () => {
        if (!this.isIntentionalClose) {
          this.scheduleReconnect()
        }
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }
    })
  }

  private handleMessage(data: string) {
    let message: ServerMessage
    try {
      message = JSON.parse(data)
    } catch {
      console.error('[EventSocket] Failed to parse message:', data)
      return
    }

    const type = message.type as keyof typeof this.handlers
    const handlers = this.handlers[type]
    if (handlers) {
      handlers.forEach((handler) => handler(message as never))
    }
  }

  private scheduleReconnect() {
    if (!this.userId || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        this.open(this.userId).catch(() => {})
      }
    }, delay)
  }

  close(): void {
    this.isIntentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    this.userId = null
    this.reconnectAttempts = this.maxReconnectAttempts
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private register<K extends keyof typeof this.handlers>(
    eventType: K,
    handler: Handler<unknown>
  ): Unsubscribe {
    const handlers = this.handlers[eventType] as Set<Handler<unknown>>
    handlers.add(handler)
    return () => handlers.delete(handler)
  }

  registerOnInvite(handler: Handler<SessionInviteEvent>): Unsubscribe {
    return this.register('session_invite', handler as Handler<unknown>)
  }

  registerOnRoomCreated(handler: Handler<RoomCreatedEvent>): Unsubscribe {
    return this.register('room_created', handler as Handler<unknown>)
  }

  registerOnSessionStarted(handler: Handler<SessionStartedEvent>): Unsubscribe {
    return this.register('session_started', handler as Handler<unknown>)
  }

  registerOnTranscript(handler: Handler<TranscriptEvent>): Unsubscribe {
    return this.register('transcript', handler as Handler<unknown>)
  }

  registerOnError(handler: Handler<ErrorEvent>): Unsubscribe {
    return this.register('error', handler as Handler<unknown>)
  }

  registerOnStopped(handler: Handler<StoppedEvent>): Unsubscribe {
    return this.register('stopped', handler as Handler<unknown>)
  }

  registerOnReady(handler: Handler<ReadyEvent>): Unsubscribe {
    return this.register('ready', handler as Handler<unknown>)
  }

  registerOnUtterance(handler: Handler<UtteranceEvent>): Unsubscribe {
    return this.register('utterance', handler as Handler<unknown>)
  }

  registerOnConnected(handler: Handler<ConnectedEvent>): Unsubscribe {
    return this.register('connected', handler as Handler<unknown>)
  }

  respondToInvite(accept: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'session_invite_response', accept }))
    }
  }

  startTranscription(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'start', sessionId }))
    }
  }

  stopTranscription(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop', sessionId }))
    }
  }
}

export const eventSocket = new EventSocket()
