import crypto from 'node:crypto'

import type { Server as HttpServer } from 'node:http'

import WebSocket, { WebSocketServer } from 'ws'
import { z } from 'zod'

export type Role = 'Doctor' | 'Patient'

export type TranscriptWord = {
  word: string
  startMs: number
  endMs: number
  confidence?: number
  speakerId?: string
}

export type TranscriptSegment = {
  startMs: number
  endMs: number
  speakerId: string | null
  role: Role | null
  text: string
  isFinal: boolean
  confidence?: number
  words?: TranscriptWord[]
}

export type Session = {
  sessionId: string
  token: string
  createdAt: string
  endedAt: string | null
  deepgramConnectionState: 'idle' | 'connecting' | 'open' | 'closed' | 'error'
  speakerMap: Record<string, Role>
  transcriptSegments: TranscriptSegment[]
  firstSpeakerSeen: string | null
  wsClientCount: number
  expiresAtMs: number
}

export type S2TConfig = {
  port: number
  deepgramApiKey: string
  corsOrigin: string | string[]
  maxSessionMinutes: number
  sessionTtlMinutes: number
  audio: {
    encoding: 'linear16'
    sampleRate: 16000
    channels: 1
  }
  deepgram: {
    model: string
    language: string
  }
}

export type Logger = {
  info: (obj: unknown, msg?: string) => void
  error: (obj: unknown, msg?: string) => void
}

type DeepgramConn = ReturnType<S2TService['connectDeepgramLive']>

type SessionRuntime = {
  deepgram: DeepgramConn | null
  clients: Set<WebSocket>
}

export class S2TService {
  private readonly sessions = new Map<string, Session>()
  private readonly runtimes = new Map<string, SessionRuntime>()

  constructor(
    public readonly config: S2TConfig,
    private readonly logger: Logger,
  ) {
    setInterval(() => this.cleanupExpired(), 30_000).unref()
  }

  createSession() {
    const token = crypto.randomBytes(24).toString('base64url')
    const sessionId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    const session: Session = {
      sessionId,
      token,
      createdAt: nowIso,
      endedAt: null,
      deepgramConnectionState: 'idle',
      speakerMap: {},
      transcriptSegments: [],
      firstSpeakerSeen: null,
      wsClientCount: 0,
      expiresAtMs: Date.now() + this.config.sessionTtlMinutes * 60_000,
    }

    this.sessions.set(sessionId, session)

    return {
      sessionId,
      token,
      wsUrl: this.wsUrlFor(session),
    }
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null
  }

  getSessionOrThrow(sessionId: string) {
    const session = this.getSession(sessionId)
    if (!session) {
      throw new HttpError(404, 'Session not found')
    }
    return session
  }

  touch(sessionId: string) {
    const session = this.getSessionOrThrow(sessionId)
    session.expiresAtMs = Date.now() + this.config.sessionTtlMinutes * 60_000
  }

  publicView(session: Session) {
    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      deepgramConnectionState: session.deepgramConnectionState,
      speakerMap: session.speakerMap,
      wsClientCount: session.wsClientCount,
    }
  }

  wsUrlFor(session: Session) {
    return `ws://localhost:${this.config.port}/ws?sessionId=${encodeURIComponent(
      session.sessionId,
    )}&token=${encodeURIComponent(session.token)}`
  }

  stopSession(sessionId: string, reason = 'stopped') {
    this.stopActiveSession(sessionId, reason)
    const s = this.getSessionOrThrow(sessionId)
    if (!s.endedAt) s.endedAt = new Date().toISOString()
    this.touch(sessionId)
    return s
  }

  deleteSession(sessionId: string) {
    this.stopActiveSession(sessionId, 'deleted')
    this.sessions.delete(sessionId)
  }

  setSpeakerMap(sessionId: string, mapping: Record<string, Role>) {
    const s = this.getSessionOrThrow(sessionId)
    s.speakerMap = { ...s.speakerMap, ...mapping }
    s.transcriptSegments = s.transcriptSegments.map((seg) => ({
      ...seg,
      role: seg.speakerId ? s.speakerMap[seg.speakerId] ?? null : null,
    }))
    this.touch(sessionId)
    return s
  }

  autoMapSpeakers(sessionId: string) {
    const s = this.getSessionOrThrow(sessionId)
    if (!s.firstSpeakerSeen) {
      throw new HttpError(409, 'No speaker detected yet')
    }
    const first = s.firstSpeakerSeen
    const other = first === 'speaker_0' ? 'speaker_1' : 'speaker_0'
    return this.setSpeakerMap(sessionId, { [first]: 'Doctor', [other]: 'Patient' })
  }

  stopActiveSession(sessionId: string, reason = 'stopped') {
    const rt = this.runtimes.get(sessionId)
    if (!rt) return

    try {
      rt.deepgram?.close()
    } catch {
      // ignore
    }
    rt.deepgram = null

    for (const ws of rt.clients) {
      try {
        ws.close(1000, reason)
      } catch {
        // ignore
      }
    }

    rt.clients.clear()
    const s = this.sessions.get(sessionId)
    if (s) s.wsClientCount = 0
    this.runtimes.delete(sessionId)
  }

  attachClient(sessionId: string, ws: WebSocket) {
    const rt = this.getOrCreateRuntime(sessionId)
    rt.clients.add(ws)
    const s = this.getSessionOrThrow(sessionId)
    s.wsClientCount = rt.clients.size
  }

  detachClient(sessionId: string, ws: WebSocket) {
    const rt = this.runtimes.get(sessionId)
    if (!rt) return
    rt.clients.delete(ws)
    const s = this.sessions.get(sessionId)
    if (s) s.wsClientCount = rt.clients.size

    if (rt.clients.size === 0) {
      try {
        rt.deepgram?.close()
      } catch {
        // ignore
      }
      rt.deepgram = null
      this.runtimes.delete(sessionId)
    }
  }

  setDeepgramState(sessionId: string, state: Session['deepgramConnectionState']) {
    const s = this.sessions.get(sessionId)
    if (!s) return
    s.deepgramConnectionState = state
  }

  startDeepgram(sessionId: string, ws: WebSocket) {
    const rt = this.getOrCreateRuntime(sessionId)
    if (rt.deepgram) return

    this.setDeepgramState(sessionId, 'connecting')
    const deepgram = this.connectDeepgramLive((event) => {
      const session = this.sessions.get(sessionId)
      if (!session) return

      if (event.type === 'result') {
        const segment = this.segmentFromDeepgram(event.result)
        if (!segment) return

        const role = segment.speakerId ? session.speakerMap[segment.speakerId] ?? null : null
        const payload = { sessionId, ...segment, role }
        ws.send(JSON.stringify({ type: 'transcript', payload }))

        if (segment.isFinal) {
          if (!session.firstSpeakerSeen && segment.speakerId) {
            session.firstSpeakerSeen = segment.speakerId
          }
          session.transcriptSegments.push({ ...segment, role })
        }
        return
      }

      if (event.type === 'utterance_end') {
        const last = session.transcriptSegments[session.transcriptSegments.length - 1]
        if (last) {
          ws.send(JSON.stringify({ type: 'utterance', payload: { sessionId, ...last } }))
        }
        return
      }

      if (event.type === 'metadata') {
        this.setDeepgramState(sessionId, 'open')
        return
      }

      if (event.type === 'closed') {
        this.setDeepgramState(sessionId, 'closed')
        return
      }

      if (event.type === 'error') {
        this.setDeepgramState(sessionId, 'error')
        ws.send(JSON.stringify({ type: 'error', message: event.message, details: event.raw }))
      }
    })

    rt.deepgram = deepgram
  }

  forwardAudio(sessionId: string, audio: WebSocket.RawData) {
    const rt = this.runtimes.get(sessionId)
    if (!rt?.deepgram?.ws || rt.deepgram.ws.readyState !== WebSocket.OPEN) return
    rt.deepgram.ws.send(audio)
  }

  stopDeepgram(sessionId: string) {
    const rt = this.runtimes.get(sessionId)
    if (!rt?.deepgram) return
    try {
      rt.deepgram.close()
    } catch {
      // ignore
    }
    rt.deepgram = null
  }

  private getOrCreateRuntime(sessionId: string) {
    const existing = this.runtimes.get(sessionId)
    if (existing) return existing
    const created: SessionRuntime = { deepgram: null, clients: new Set() }
    this.runtimes.set(sessionId, created)
    return created
  }

  private cleanupExpired() {
    const now = Date.now()
    for (const [id, s] of this.sessions.entries()) {
      if (s.expiresAtMs <= now) {
        this.stopActiveSession(id, 'expired')
        this.sessions.delete(id)
      }
    }
  }

  private parseSpeakerId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) return parsed
    }
    return null
  }

  private dominantSpeakerIdFromWords(words?: { speaker?: unknown }[]): string | null {
    if (!words || words.length === 0) return null
    const counts = new Map<number, number>()
    for (const w of words) {
      const speaker = this.parseSpeakerId(w.speaker)
      if (speaker === null) continue
      counts.set(speaker, (counts.get(speaker) ?? 0) + 1)
    }
    let best: { speaker: number; count: number } | null = null
    for (const [speaker, count] of counts.entries()) {
      if (!best || count > best.count) best = { speaker, count }
    }
    if (!best) return null
    return best.speaker <= 0 ? 'speaker_0' : 'speaker_1'
  }

  private segmentFromDeepgram(dg: {
    transcript: string
    isFinal: boolean
    confidence?: number
    words?: any[]
  }): TranscriptSegment | null {
    const text = dg.transcript?.trim()
    if (!text) return null

    const speakerId = this.dominantSpeakerIdFromWords(dg.words)

    let startMs = Date.now()
    let endMs = startMs
    const words = Array.isArray(dg.words) ? dg.words : undefined
    if (words && words.length > 0) {
      const first = words[0]
      const last = words[words.length - 1]
      if (typeof first?.start === 'number') startMs = Math.round(first.start * 1000)
      if (typeof last?.end === 'number') endMs = Math.round(last.end * 1000)
    }

    return {
      startMs,
      endMs,
      speakerId,
      role: null,
      text,
      isFinal: dg.isFinal,
      confidence: dg.confidence,
      words: words?.map((w) => ({
        word: w.word,
        startMs: Math.round((w.start ?? 0) * 1000),
        endMs: Math.round((w.end ?? 0) * 1000),
        confidence: typeof w.confidence === 'number' ? w.confidence : undefined,
        speakerId: (() => {
          const sp = this.parseSpeakerId(w.speaker)
          if (sp === null) return undefined
          return sp <= 0 ? 'speaker_0' : 'speaker_1'
        })(),
      })),
    }
  }

  private connectDeepgramLive(
    onEvent: (event:
      | { type: 'result'; result: { transcript: string; isFinal: boolean; confidence?: number; words?: any[] } }
      | { type: 'utterance_end' }
      | { type: 'metadata'; raw: unknown }
      | { type: 'warning'; raw: unknown }
      | { type: 'error'; message: string; raw?: unknown }
      | { type: 'closed'; code: number; reason: string }) => void,
  ) {
    const url = new URL('wss://api.deepgram.com/v1/listen')

    url.searchParams.set('model', this.config.deepgram.model)
    url.searchParams.set('language', this.config.deepgram.language)
    url.searchParams.set('punctuate', 'true')
    url.searchParams.set('smart_format', 'true')
    url.searchParams.set('diarize', 'true')
    url.searchParams.set('interim_results', 'true')
    url.searchParams.set('utterances', 'true')

    url.searchParams.set('encoding', this.config.audio.encoding)
    url.searchParams.set('sample_rate', String(this.config.audio.sampleRate))
    url.searchParams.set('channels', String(this.config.audio.channels))

    const ws = new WebSocket(url.toString(), {
      headers: {
        Authorization: `Token ${this.config.deepgramApiKey}`,
      },
    })

    ws.on('open', () => {
      onEvent({ type: 'metadata', raw: { type: 'Open' } })
    })

    ws.on('message', (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString('utf8')
        const msg = JSON.parse(text) as any

        if (msg?.type === 'Metadata') {
          onEvent({ type: 'metadata', raw: msg })
          return
        }
        if (msg?.type === 'Warning') {
          onEvent({ type: 'warning', raw: msg })
          return
        }
        if (msg?.type === 'Error') {
          onEvent({ type: 'error', message: msg?.message ?? 'Deepgram error', raw: msg })
          return
        }
        if (msg?.type === 'UtteranceEnd') {
          onEvent({ type: 'utterance_end' })
          return
        }

        const transcript: string | undefined = msg?.channel?.alternatives?.[0]?.transcript
        if (typeof transcript === 'string') {
          const alt = msg.channel.alternatives[0]
          onEvent({
            type: 'result',
            result: {
              transcript,
              isFinal: Boolean(msg?.is_final ?? msg?.speech_final ?? false),
              confidence: typeof alt?.confidence === 'number' ? alt.confidence : undefined,
              words: Array.isArray(alt?.words) ? alt.words : undefined,
            },
          })
        }
      } catch (err) {
        onEvent({ type: 'error', message: 'Failed to parse Deepgram message', raw: String(err) })
      }
    })

    ws.on('close', (code, reason) => {
      onEvent({ type: 'closed', code, reason: reason.toString() })
    })

    ws.on('error', (err) => {
      onEvent({ type: 'error', message: 'Deepgram websocket error', raw: String(err) })
    })

    const keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }
    }, 10_000)
    keepAlive.unref()

    return {
      ws,
      close: () => {
        clearInterval(keepAlive)
        try {
          ws.close()
        } catch {
          // ignore
        }
      },
    }
  }
}

export class HttpError extends Error {
  public readonly status: number
  public readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

const clientControlSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('start'),
    format: z.string().optional(),
    sampleRate: z.number().int().positive().optional(),
    channels: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('stop'),
  }),
])

function parseWsUrl(reqUrl: string, port: number) {
  const url = new URL(reqUrl, `http://localhost:${port}`)
  const sessionId = url.searchParams.get('sessionId') ?? ''
  const token = url.searchParams.get('token') ?? ''
  return { sessionId, token }
}

function sendJson(ws: WebSocket, message: unknown) {
  ws.send(JSON.stringify(message))
}

export function createS2TWebSocketServer(service: S2TService, httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      if (!req.url?.startsWith('/ws')) {
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } catch {
      socket.destroy()
    }
  })

  wss.on('connection', (ws, req) => {
    const { sessionId, token } = parseWsUrl(req.url ?? '/ws', service.config.port)

    try {
      const session = service.getSessionOrThrow(sessionId)
      if (token !== session.token) {
        throw new HttpError(401, 'Invalid session token')
      }
      if (session.endedAt) {
        throw new HttpError(409, 'Session already ended')
      }
      if (session.wsClientCount >= 1) {
        throw new HttpError(409, 'Session already has an active WebSocket client')
      }

      service.touch(sessionId)
      service.attachClient(sessionId, ws)

      sendJson(ws, { type: 'ready', sessionId })

      const maxDurationMs = service.config.maxSessionMinutes * 60_000
      const maxTimer = setTimeout(() => {
        sendJson(ws, { type: 'error', message: 'Max session duration reached' })
        try {
          ws.close(1000, 'max duration')
        } catch {
          // ignore
        }
      }, maxDurationMs)
      maxTimer.unref()

      ws.on('message', (data, isBinary) => {
        try {
          service.touch(sessionId)

          if (!isBinary) {
            const text = typeof data === 'string' ? data : data.toString('utf8')
            const parsed = clientControlSchema.safeParse(JSON.parse(text))
            if (!parsed.success) {
              sendJson(ws, {
                type: 'error',
                message: 'Invalid control message',
                details: parsed.error.flatten(),
              })
              return
            }

            if (parsed.data.type === 'start') {
              if (
                (parsed.data.sampleRate &&
                  parsed.data.sampleRate !== service.config.audio.sampleRate) ||
                (parsed.data.channels &&
                  parsed.data.channels !== service.config.audio.channels) ||
                (parsed.data.format && parsed.data.format !== service.config.audio.encoding)
              ) {
                sendJson(ws, {
                  type: 'error',
                  message: 'Audio format mismatch',
                  details: {
                    expected: service.config.audio,
                    received: parsed.data,
                  },
                })
                return
              }

              service.startDeepgram(sessionId, ws)
              return
            }

            if (parsed.data.type === 'stop') {
              service.stopDeepgram(sessionId)
              const stopped = service.stopSession(sessionId, 'stopped')
              sendJson(ws, {
                type: 'stopped',
                finalTranscriptSummary: {
                  sessionId,
                  endedAt: stopped.endedAt,
                  segmentCount: stopped.transcriptSegments.length,
                },
              })
              try {
                ws.close(1000, 'stopped')
              } catch {
                // ignore
              }
              return
            }

            return
          }

          service.forwardAudio(sessionId, data)
        } catch (err) {
          sendJson(ws, {
            type: 'error',
            message: 'WS message handler error',
            details: String(err),
          })
        }
      })

      ws.on('close', () => {
        clearTimeout(maxTimer)
        service.detachClient(sessionId, ws)
      })
    } catch (err) {
      const status =
        err instanceof HttpError ? err.status : typeof (err as any)?.status === 'number' ? (err as any).status : 500
      const message = err instanceof Error ? err.message : 'WebSocket error'
      sendJson(ws, { type: 'error', message, details: { status } })
      try {
        ws.close(1008, message)
      } catch {
        // ignore
      }
    }
  })

  return wss
}
