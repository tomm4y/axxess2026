import crypto from 'node:crypto'
import { createServer } from 'node:http'
import path from 'node:path'

import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { createS2TRouter } from './s2tRoutes.js'
import { createS2TWebSocketServer, HttpError, S2TService } from './s2tService.js'

dotenv.config()

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
if (!DEEPGRAM_API_KEY) {
  throw new Error('Missing DEEPGRAM_API_KEY')
}

const PORT = 3001
const CORS_ORIGIN: string | string[] = '*'

const logger = {
  info: (obj: unknown, msg?: string) => console.log(msg ?? '', obj),
  error: (obj: unknown, msg?: string) => console.error(msg ?? '', obj),
}

const app = express()
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      },
      'http',
    )
  })
  next()
})
app.use(
  cors({
    origin: CORS_ORIGIN,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.get('/', (_req, res) => {
  res
    .status(200)
    .type('text/plain')
    .send(
      [
        's2t backend is running.',
        '',
        'Create a session:',
        '  curl -s -X POST http://localhost:3001/api/sessions',
        '',
        'Open browser test client:',
        '  http://localhost:3001/examples/browser-client.html',
      ].join('\n'),
    )
})

app.use(
  '/examples',
  express.static(path.join(process.cwd(), 's2t', 'examples'), { fallthrough: false }),
)

app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

const service = new S2TService(
  {
    port: PORT,
    deepgramApiKey: DEEPGRAM_API_KEY,
    corsOrigin: CORS_ORIGIN,
    maxSessionMinutes: 30,
    sessionTtlMinutes: 120,
    audio: { encoding: 'linear16', sampleRate: 16000, channels: 1 },
    deepgram: { model: 'nova-2', language: 'en' },
  },
  logger,
)

app.use('/api', createS2TRouter(service))

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details })
    return
  }
  logger.error({ err }, 'unhandled error')
  res.status(500).json({ error: 'Internal Server Error' })
})

const httpServer = createServer(app)
createS2TWebSocketServer(service, httpServer)

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 's2t server listening')
})
