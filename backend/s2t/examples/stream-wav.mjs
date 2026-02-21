import fs from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'

import WebSocket from 'ws'

function readWavPcm16Mono(buffer) {
  // Minimal WAV parser: assumes PCM 16-bit little-endian, mono.
  // Returns raw PCM payload (Buffer) and sampleRate.
  const riff = buffer.toString('ascii', 0, 4)
  const wave = buffer.toString('ascii', 8, 12)
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a WAV file')

  let offset = 12
  let sampleRate = null
  let dataOffset = null
  let dataSize = null

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const chunkStart = offset + 8

    if (id === 'fmt ') {
      const audioFormat = buffer.readUInt16LE(chunkStart)
      const numChannels = buffer.readUInt16LE(chunkStart + 2)
      sampleRate = buffer.readUInt32LE(chunkStart + 4)
      const bitsPerSample = buffer.readUInt16LE(chunkStart + 14)
      if (audioFormat !== 1) throw new Error('WAV is not PCM')
      if (numChannels !== 1) throw new Error('WAV must be mono')
      if (bitsPerSample !== 16) throw new Error('WAV must be 16-bit')
    }

    if (id === 'data') {
      dataOffset = chunkStart
      dataSize = size
      break
    }

    offset = chunkStart + size + (size % 2) // word aligned
  }

  if (!sampleRate || dataOffset === null || dataSize === null) {
    throw new Error('Invalid WAV (missing fmt/data)')
  }

  return {
    sampleRate,
    pcm: buffer.subarray(dataOffset, dataOffset + dataSize),
  }
}

const [wsUrl, wavPath] = process.argv.slice(2)
if (!wsUrl || !wavPath) {
  console.error('Usage: node examples/stream-wav.mjs <wsUrl> <wavPath>')
  process.exit(1)
}

const wav = fs.readFileSync(wavPath)
const { sampleRate, pcm } = readWavPcm16Mono(wav)

console.log('WAV sampleRate:', sampleRate, 'bytes:', pcm.length)

const ws = new WebSocket(wsUrl)
ws.binaryType = 'arraybuffer'

ws.on('open', async () => {
  ws.send(JSON.stringify({ type: 'start', format: 'linear16', sampleRate: 16000, channels: 1 }))

  // If your WAV is not 16kHz, resample it first (e.g. via ffmpeg).
  if (sampleRate !== 16000) {
    console.error('WAV must be 16kHz for this example. Convert with:')
    console.error('  ffmpeg -i in.wav -ac 1 -ar 16000 -f wav out.wav')
    process.exit(1)
  }

  // Stream ~100ms frames (16k samples/sec => 1600 samples per 100ms => 3200 bytes).
  const frameBytes = 3200
  for (let i = 0; i < pcm.length; i += frameBytes) {
    const chunk = pcm.subarray(i, Math.min(i + frameBytes, pcm.length))
    ws.send(chunk)
    await delay(100)
  }

  ws.send(JSON.stringify({ type: 'stop' }))
})

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString('utf8'))
    if (msg.type === 'transcript') {
      const p = msg.payload
      console.log(`[${p.role ?? p.speakerId ?? 'unknown'}] ${p.isFinal ? 'final' : 'interim'}: ${p.text}`)
    } else if (msg.type === 'error') {
      console.error('ERROR:', msg.message)
    }
  } catch {
    // ignore
  }
})

ws.on('close', () => process.exit(0))

