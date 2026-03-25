import fs from 'node:fs'
import path from 'node:path'
import { configManager } from './config-manager'
import type { Voice } from '~/lib/types'

const VALID_AUDIO_EXTENSIONS = ['.wav', '.mp3']

function resolveAbsolute(relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath
  return path.resolve(process.cwd(), relativePath)
}

/** Get the absolute path to predefined voices directory */
export function getVoicesPath(): string {
  return resolveAbsolute(configManager.getString('tts_engine.predefined_voices_path', 'voices'))
}

/** Get the absolute path to reference audio directory */
export function getReferenceAudioPath(): string {
  return resolveAbsolute(configManager.getString('tts_engine.reference_audio_path', 'reference_audio'))
}

/** Get the absolute path to output directory */
export function getOutputPath(): string {
  return resolveAbsolute(configManager.getString('paths.output', 'outputs'))
}

/** List predefined voice files with display names */
export function listPredefinedVoices(): Voice[] {
  const voicesDir = getVoicesPath()

  if (!fs.existsSync(voicesDir)) {
    fs.mkdirSync(voicesDir, { recursive: true })
    return []
  }

  try {
    const files = fs.readdirSync(voicesDir)
    return files
      .filter((f) => VALID_AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((filename) => ({
        filename,
        display_name: path.basename(filename, path.extname(filename)),
      }))
  } catch (err) {
    console.error('[FileManager] Error listing predefined voices:', err)
    return []
  }
}

/** List reference audio files */
export function listReferenceFiles(): string[] {
  const refDir = getReferenceAudioPath()

  if (!fs.existsSync(refDir)) {
    fs.mkdirSync(refDir, { recursive: true })
    return []
  }

  try {
    const files = fs.readdirSync(refDir)
    return files
      .filter((f) => VALID_AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.error('[FileManager] Error listing reference files:', err)
    return []
  }
}

/** Sanitize a filename for safe storage */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}

/** Validate that a file exists and has a valid audio extension */
export function validateAudioFile(filePath: string): { valid: boolean; message: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, message: `File not found: ${filePath}` }
  }

  const ext = path.extname(filePath).toLowerCase()
  if (!VALID_AUDIO_EXTENSIONS.includes(ext)) {
    return { valid: false, message: `Invalid file type: ${ext}. Only .wav and .mp3 are allowed.` }
  }

  const stats = fs.statSync(filePath)
  if (stats.size < 100) {
    return { valid: false, message: 'File is too small to be a valid audio file.' }
  }

  return { valid: true, message: 'Valid audio file.' }
}

/** Save an uploaded file to a directory, returning the sanitized filename */
export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string,
  targetDir: string,
): Promise<{ filename: string; error?: string }> {
  const safeName = sanitizeFilename(originalFilename)
  const ext = path.extname(safeName).toLowerCase()

  if (!VALID_AUDIO_EXTENSIONS.includes(ext)) {
    return { filename: safeName, error: 'Invalid file type. Only .wav and .mp3 are allowed.' }
  }

  const targetPath = path.join(targetDir, safeName)

  if (fs.existsSync(targetPath)) {
    return { filename: safeName } // Already exists, not an error
  }

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    fs.writeFileSync(targetPath, fileBuffer)

    const validation = validateAudioFile(targetPath)
    if (!validation.valid) {
      fs.unlinkSync(targetPath)
      return { filename: safeName, error: validation.message }
    }

    return { filename: safeName }
  } catch (err) {
    return { filename: safeName, error: `Failed to save file: ${err}` }
  }
}
