/**
 * Launches python-server/server.py using the venv Python if it exists,
 * falling back to the system `python` / `python3` executable.
 *
 * Resolves the correct venv path cross-platform:
 *   Windows : python-server/venv/Scripts/python.exe
 *   Unix/Mac: python-server/venv/bin/python
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const isWindows = process.platform === 'win32'

const venvPython = resolve(
  isWindows
    ? 'python-server/venv/Scripts/python.exe'
    : 'python-server/venv/bin/python'
)

let pythonExe
if (existsSync(venvPython)) {
  pythonExe = venvPython
  console.log(`[python-server] Using venv Python: ${venvPython}`)
} else {
  pythonExe = isWindows ? 'python' : 'python3'
  console.warn(
    `[python-server] Venv not found at ${venvPython}.\n` +
    `  Run "npm run python:install" to set it up, or activate your venv manually.\n` +
    `  Falling back to system: ${pythonExe}`
  )
}

const proc = spawn(pythonExe, ['python-server/server.py'], {
  stdio: 'inherit',
  shell: false,
})

proc.on('error', (err) => {
  console.error(`[python-server] Failed to start: ${err.message}`)
  process.exit(1)
})

proc.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0) // killed by concurrently --kill-others-on-fail, not a real error
  }
  process.exit(code ?? 0)
})
