import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const cwd = process.cwd()
const distEntry = path.join(cwd, 'dist', 's2t', 'index.js')

function run(cmd, args, options = {}) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  return child
}

function waitForFile(filePath, timeoutMs = 60_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (fs.existsSync(filePath)) {
        resolve()
        return
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${filePath}`))
        return
      }
      setTimeout(tick, 200)
    }
    tick()
  })
}

const tsc = run('npx', ['tsc', '-p', 'tsconfig.s2t.json', '--watch', '--preserveWatchOutput'])

let nodeProcess = null

try {
  await waitForFile(distEntry)
  nodeProcess = run('node', ['--watch', distEntry])
} catch (err) {
  console.error(String(err))
}

function shutdown(code = 0) {
  try {
    tsc.kill('SIGINT')
  } catch {}
  try {
    nodeProcess?.kill('SIGINT')
  } catch {}
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

tsc.on('exit', (code) => {
  if (code && code !== 0) shutdown(code)
})