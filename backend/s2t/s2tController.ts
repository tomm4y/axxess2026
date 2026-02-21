import type { RequestHandler } from 'express'
import { z } from 'zod'

import { HttpError, type S2TService } from './s2tService.js'

function parseBearerToken(value: string | undefined): string | null {
  if (!value) return null
  const [scheme, token] = value.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export function requireSessionAuth(service: S2TService): RequestHandler {
  return (req, _res, next) => {
    const sessionId = req.params.sessionId
    const session = sessionId ? service.getSession(sessionId) : null
    if (!session) {
      next(new HttpError(404, 'Session not found'))
      return
    }

    const token =
      parseBearerToken(req.header('authorization')) ?? req.header('x-session-token')
    if (!token || token !== session.token) {
      next(new HttpError(401, 'Invalid session token'))
      return
    }

    next()
  }
}

export function createS2TController(service: S2TService) {
  const speakerMapSchema = z.record(z.enum(['Doctor', 'Patient']))

  return {
    createSession: ((_req, res) => {
      const created = service.createSession()
      res.status(201).json(created)
    }) satisfies RequestHandler,

    getSession: ((req, res) => {
      const s = service.getSessionOrThrow(req.params.sessionId)
      res.status(200).json(service.publicView(s))
    }) satisfies RequestHandler,

    stopSession: ((req, res) => {
      const s = service.stopSession(req.params.sessionId, 'stopped via http')
      res.status(200).json({
        sessionId: s.sessionId,
        endedAt: s.endedAt,
        transcript: s.transcriptSegments,
      })
    }) satisfies RequestHandler,

    getTranscript: ((req, res) => {
      const s = service.getSessionOrThrow(req.params.sessionId)
      res.status(200).json({ sessionId: s.sessionId, segments: s.transcriptSegments })
    }) satisfies RequestHandler,

    setSpeakerMap: ((req, res) => {
      const mapping = speakerMapSchema.parse(req.body)
      const s = service.setSpeakerMap(req.params.sessionId, mapping)
      res.status(200).json({ sessionId: s.sessionId, speakerMap: s.speakerMap })
    }) satisfies RequestHandler,

    autoMapSpeakers: ((req, res) => {
      const s = service.autoMapSpeakers(req.params.sessionId)
      res.status(200).json({ sessionId: s.sessionId, speakerMap: s.speakerMap })
    }) satisfies RequestHandler,

    getSpeakers: ((req, res) => {
      const s = service.getSessionOrThrow(req.params.sessionId)
      res.status(200).json({ sessionId: s.sessionId, speakerMap: s.speakerMap })
    }) satisfies RequestHandler,

    deleteSession: ((req, res) => {
      service.deleteSession(req.params.sessionId)
      res.status(204).send()
    }) satisfies RequestHandler,
  }
}

