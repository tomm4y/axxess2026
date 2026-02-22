import { Router } from 'express'

import { createS2TController, requireSessionAuth } from './s2tController.js'
import type { S2TService } from './s2tService.js'

export function createS2TRouter(service: S2TService) {
  const router = Router()
  const c = createS2TController(service)

  // Helpful message if someone hits this in the browser (GET).
  router.get('/sessions', (_req, res) => {
    res.status(405).json({ error: 'Method Not Allowed. Use POST /api/sessions.' })
  })

  router.post('/sessions', c.createSession)

  router.get('/sessions/:sessionId', requireSessionAuth(service), c.getSession)
  router.post('/sessions/:sessionId/stop', requireSessionAuth(service), c.stopSession)
  router.get('/sessions/:sessionId/transcript', requireSessionAuth(service), c.getTranscript)

  router.post('/sessions/:sessionId/speakers/map', requireSessionAuth(service), c.setSpeakerMap)
  router.post('/sessions/:sessionId/speakers/auto', requireSessionAuth(service), c.autoMapSpeakers)
  router.get('/sessions/:sessionId/speakers', requireSessionAuth(service), c.getSpeakers)

  router.delete('/sessions/:sessionId', requireSessionAuth(service), c.deleteSession)

  return router
}
