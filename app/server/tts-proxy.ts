import { configManager } from './config-manager'
import type { ModelInfo } from '~/lib/types'

function getEngineUrl(): string {
  return configManager.getString('server.python_engine_url', 'http://localhost:8005')
}

/** Check if the Python TTS engine is reachable */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getEngineUrl()}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Get model info from the Python engine */
export async function getModelInfo(): Promise<ModelInfo> {
  try {
    const response = await fetch(`${getEngineUrl()}/model-info`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Engine returned ${response.status}: ${response.statusText}`)
    }

    return (await response.json()) as ModelInfo
  } catch (err) {
    console.error('[TTSProxy] Failed to get model info:', err)
    return {
      loaded: false,
      class_name: 'Unknown',
      type: 'original',
      device: 'unknown',
      supports_paralinguistic_tags: false,
    }
  }
}

/** Trigger model reload on the Python engine */
export async function reloadModel(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${getEngineUrl()}/reload-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000), // Model loading can take a while
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, message: `Engine error ${response.status}: ${body}` }
    }

    const result = (await response.json()) as { message?: string }
    return { success: true, message: result.message ?? 'Model reloaded successfully' }
  } catch (err) {
    return { success: false, message: `Failed to reload model: ${err}` }
  }
}

/** Synthesize audio from text via the Python engine */
export async function synthesize(params: {
  text: string
  audio_prompt_path?: string
  temperature: number
  exaggeration: number
  cfg_weight: number
  seed: number
  language: string
}): Promise<{ audio: ArrayBuffer; sample_rate: number } | { error: string }> {
  try {
    const response = await fetch(`${getEngineUrl()}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(300000), // 5 min timeout for synthesis
    })

    if (!response.ok) {
      const body = await response.text()
      return { error: `Synthesis failed (${response.status}): ${body}` }
    }

    const sampleRate = parseInt(response.headers.get('X-Sample-Rate') ?? '24000', 10)
    const audio = await response.arrayBuffer()

    return { audio, sample_rate: sampleRate }
  } catch (err) {
    return { error: `Synthesis request failed: ${err}` }
  }
}
