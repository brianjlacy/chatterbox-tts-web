import { configManager } from './config-manager'
import type { ModelInfo, OpenAISpeechRequest, TTSRequest } from '~/lib/types'

function getEngineUrl(): string {
  return configManager.getString('server.python_engine_url', 'http://localhost:8005')
}

async function getErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const json = (await response.json()) as { detail?: string; error?: string; message?: string }
      return json.detail ?? json.error ?? json.message ?? `Engine returned ${response.status}`
    } catch {
      return `Engine returned ${response.status}`
    }
  }

  try {
    const text = await response.text()
    return text || `Engine returned ${response.status}`
  } catch {
    return `Engine returned ${response.status}`
  }
}

function getSuggestedFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined

  const match = /filename="([^"]+)"/i.exec(contentDisposition)
  return match?.[1]
}

/** Check if the Python TTS engine is reachable */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getEngineUrl()}/api/model-info`, {
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
    const response = await fetch(`${getEngineUrl()}/api/model-info`, {
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
    const response = await fetch(`${getEngineUrl()}/restart_server`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000), // Model loading can take a while
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Engine error ${response.status}: ${await getErrorMessage(response)}`,
      }
    }

    const result = (await response.json()) as { message?: string }
    return { success: true, message: result.message ?? 'Model reloaded successfully' }
  } catch (err) {
    return { success: false, message: `Failed to reload model: ${err}` }
  }
}

/** Generate TTS audio by proxying the legacy Python server /tts endpoint. */
export async function generateSpeech(
  params: TTSRequest,
): Promise<
  | { audio: ArrayBuffer; sample_rate: number; content_type: string; filename?: string }
  | { error: string }
> {
  try {
    const response = await fetch(`${getEngineUrl()}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(300000), // 5 min timeout for synthesis
    })

    if (!response.ok) {
      return { error: `Generation failed (${response.status}): ${await getErrorMessage(response)}` }
    }

    const sampleRate = parseInt(response.headers.get('X-Sample-Rate') ?? '24000', 10)
    const audio = await response.arrayBuffer()

    return {
      audio,
      sample_rate: sampleRate,
      content_type: response.headers.get('Content-Type') ?? `audio/${params.output_format}`,
      filename: getSuggestedFilename(response.headers.get('Content-Disposition')),
    }
  } catch (err) {
    return { error: `Generation request failed: ${err}` }
  }
}

/** Proxy the OpenAI-compatible speech endpoint exposed by the Python server. */
export async function generateOpenAiSpeech(
  params: OpenAISpeechRequest,
): Promise<
  | { audio: ArrayBuffer; content_type: string; sample_rate?: number; status: number }
  | { error: string; status: number }
> {
  try {
    const response = await fetch(`${getEngineUrl()}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(300000),
    })

    if (!response.ok) {
      return {
        error: await getErrorMessage(response),
        status: response.status,
      }
    }

    return {
      audio: await response.arrayBuffer(),
      content_type: response.headers.get('Content-Type') ?? 'audio/wav',
      sample_rate: response.headers.get('X-Sample-Rate')
        ? parseInt(response.headers.get('X-Sample-Rate') as string, 10)
        : undefined,
      status: response.status,
    }
  } catch (err) {
    return {
      error: `OpenAI speech request failed: ${err}`,
      status: 502,
    }
  }
}
