/**
 * Creates the venv (if needed) and installs python-server/requirements.txt into it.
 *
 *   Windows : python-server/venv/Scripts/pip
 *   Unix/Mac: python-server/venv/bin/pip
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const isWindows = process.platform === 'win32'
const venvDir = resolve('python-server/venv')
const pip = resolve(isWindows ? 'python-server/venv/Scripts/pip.exe' : 'python-server/venv/bin/pip')
const python = isWindows ? 'python' : 'python3'

// 1. Create venv if it doesn't exist
if (!existsSync(venvDir)) {
  console.log(`[python-install] Creating venv at ${venvDir} ...`)
  const result = spawnSync(python, ['-m', 'venv', venvDir], { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`[python-install] Failed to create venv. Is Python installed and on PATH?`)
    process.exit(1)
  }
} else {
  console.log(`[python-install] Venv already exists at ${venvDir}`)
}

// 2. Ensure setuptools + wheel are present (absent by default in Python 3.12+ venvs,
//    required for building source distributions like numpy)
console.log('[python-install] Installing setuptools/wheel ...')
const bootstrap = spawnSync(pip, ['install', 'setuptools', 'wheel'], {
  stdio: 'inherit',
  shell: false,
})
if (bootstrap.status !== 0) {
  console.error('[python-install] Failed to install setuptools/wheel.')
  process.exit(1)
}

// 3. Install chatterbox-tts without its declared deps (bypasses stale numpy<1.26 constraint)
console.log('[python-install] Installing chatterbox-tts (--no-deps) ...')
const chatterbox = spawnSync(pip, [
  'install', '--no-deps',
  'chatterbox-tts @ git+https://github.com/devnen/chatterbox-v2.git@master',
], { stdio: 'inherit', shell: false })
if (chatterbox.status !== 0) {
  console.error('[python-install] Failed to install chatterbox-tts.')
  process.exit(1)
}

// 4. Install remaining requirements (numpy 2.x, torch, fastapi, etc.)
console.log('[python-install] Installing python-server/requirements.txt ...')
const result = spawnSync(pip, ['install', '-r', 'python-server/requirements.txt'], {
  stdio: 'inherit',
  shell: false,
})
process.exit(result.status ?? 0)
