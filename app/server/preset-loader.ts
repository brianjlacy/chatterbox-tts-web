import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { Preset } from '~/lib/types'

const PRESETS_PATH = path.resolve(process.cwd(), 'presets.yaml')

/** Load presets from the YAML file */
export function loadPresets(): Preset[] {
  try {
    if (!fs.existsSync(PRESETS_PATH)) {
      console.warn(`[PresetLoader] Presets file not found: ${PRESETS_PATH}`)
      return []
    }

    const content = fs.readFileSync(PRESETS_PATH, 'utf-8')
    const parsed = yaml.load(content)

    if (!Array.isArray(parsed)) {
      console.warn('[PresetLoader] Invalid presets format. Expected array.')
      return []
    }

    return parsed.map((item: Record<string, unknown>) => ({
      name: String(item['name'] ?? ''),
      text: String(item['text'] ?? ''),
      params: (item['params'] ?? {}) as Preset['params'],
    }))
  } catch (err) {
    console.error('[PresetLoader] Error loading presets:', err)
    return []
  }
}
