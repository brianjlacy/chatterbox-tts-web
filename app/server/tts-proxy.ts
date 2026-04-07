/**
 * TTS engine client and orchestration layer.
 *
 * Communicates with the Python inference microservice (3 endpoints only:
 * /model-info, /synthesize, /reload). All orchestration logic lives here:
 * text chunking, per-chunk synthesis, audio stitching, speed adjustment,
 * silence post-processing, encoding, and optional disk save.
 */

import fs from 'node:fs'
import path from 'node:path'
import { configManager } from './config-manager'
import { getVoicesPath, getReferenceAudioPath, getOutputPath, validateAudioFile } from './file-manager'
import { chunkTextBySentences } from './text-processing'
import { decodeWav, encodeAudio } from './audio-encoder'
import {
  stitchAudioSegments,
  applySpeedFactor,
  trimLeadTrailSilence,
  fixInternalSilence,
  normalizeAudio,
} from './audio-processing'
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

// --- Engine health / model info ---

/** Check if the Python inference microservice is reachable */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getEngineUrl()}/model-info`, {
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Get model info from the Python microservice */
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

/** Trigger model reload on the Python microservice */
export async function reloadModel(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${getEngineUrl()}/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000),
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

// --- Internal: single-chunk synthesis via Python microservice ---

interface SynthesizeParams {
  text: string
  audioPromptPath?: string
  temperature: number
  exaggeration: number
  cfgWeight: number
  seed: number
  language: string
}

async function callSynthesize(params: SynthesizeParams): Promise<Buffer> {
  const body = {
    text: params.text,
    audio_prompt_path: params.audioPromptPath ?? null,
    temperature: params.temperature,
    exaggeration: params.exaggeration,
    cfg_weight: params.cfgWeight,
    seed: params.seed,
    language: params.language,
  }

  const response = await fetch(`${getEngineUrl()}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000), // 5 min per chunk
  })

  if (!response.ok) {
    throw new Error(`Synthesis failed (${response.status}): ${await getErrorMessage(response)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// --- Voice path resolution ---

function resolveVoicePath(
  voiceMode: TTSRequest['voice_mode'],
  predefinedVoiceId?: string,
  referenceAudioFilename?: string,
): string | undefined {
  if (voiceMode === 'predefined' && predefinedVoiceId) {
    return path.join(getVoicesPath(), predefinedVoiceId)
  }
  if (voiceMode === 'clone' && referenceAudioFilename) {
    return path.join(getReferenceAudioPath(), referenceAudioFilename)
  }
  return undefined
}

// --- Main TTS generation ---

export async function generateSpeech(
  params: TTSRequest,
): Promise<
  | { audio: ArrayBuffer; sample_rate: number; content_type: string; filename?: string; chunks_processed: number }
  | { error: string }
> {
  try {
    // 1. Resolve and validate voice path
    const audioPromptPath = resolveVoicePath(
      params.voice_mode,
      params.predefined_voice_id,
      params.reference_audio_filename,
    )
    if (audioPromptPath) {
      const validation = validateAudioFile(audioPromptPath)
      if (!validation.valid) return { error: validation.message }
    }

    // 2. Text chunking
    const chunks =
      params.split_text && params.text.length > params.chunk_size * 1.5
        ? chunkTextBySentences(params.text, params.chunk_size)
        : [params.text]

    const inferenceParams = {
      audioPromptPath,
      temperature: params.temperature,
      exaggeration: params.exaggeration,
      cfgWeight: params.cfg_weight,
      seed: params.seed,
      language: params.language,
    }

    // 3. Per-chunk synthesis
    const segments: Float32Array[] = []
    let sampleRate = 24000
    for (const chunk of chunks) {
      const wavBytes = await callSynthesize({ text: chunk, ...inferenceParams })
      const decoded = decodeWav(wavBytes)
      sampleRate = decoded.sampleRate
      segments.push(decoded.audio)
    }

    // 4. Stitch
    const enableCrossfade = configManager.getBool('audio_processing.enable_crossfade', true)
    let audio = stitchAudioSegments(segments, sampleRate, enableCrossfade)

    // 5. Speed factor
    if (params.speed_factor !== 1.0) {
      audio = applySpeedFactor(audio, sampleRate, params.speed_factor)
    }

    // 6. Silence post-processing (off by default)
    if (configManager.getBool('audio_processing.enable_silence_trimming', false)) {
      audio = trimLeadTrailSilence(audio, sampleRate)
    }
    if (configManager.getBool('audio_processing.enable_internal_silence_fix', false)) {
      audio = fixInternalSilence(audio, sampleRate)
    }

    // 7. Normalize
    audio = normalizeAudio(audio)

    // 8. Encode to requested format (normalize unsupported formats to WAV)
    const effectiveFormat = params.output_format === 'opus' ? 'wav' : params.output_format
    const audioBuffer = encodeAudio(audio, sampleRate, effectiveFormat)

    // 9. Optional disk save
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `tts_output_${timestamp}.${effectiveFormat}`
    if (configManager.getBool('audio_output.save_to_disk', false)) {
      try {
        const outputDir = getOutputPath()
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
        fs.writeFileSync(path.join(outputDir, filename), audioBuffer)
      } catch (err) {
        console.warn('[TTSProxy] Failed to save audio to disk:', err)
      }
    }

    return {
      audio: audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
      sample_rate: sampleRate,
      content_type: `audio/${effectiveFormat}`,
      filename,
      chunks_processed: chunks.length,
    }
  } catch (err) {
    return { error: `Generation failed: ${err}` }
  }
}

// --- OpenAI-compatible speech ---

export async function generateOpenAiSpeech(
  params: OpenAISpeechRequest,
): Promise<
  | { audio: ArrayBuffer; content_type: string; sample_rate?: number; status: number }
  | { error: string; status: number }
> {
  try {
    // Resolve voice: try predefined voices dir first, then reference audio dir
    let audioPromptPath: string | undefined
    const inVoices = path.join(getVoicesPath(), params.voice)
    const inRef = path.join(getReferenceAudioPath(), params.voice)
    if (fs.existsSync(inVoices)) audioPromptPath = inVoices
    else if (fs.existsSync(inRef)) audioPromptPath = inRef

    if (params.voice && !audioPromptPath) {
      return { error: `Voice '${params.voice}' not found in predefined voices or reference audio`, status: 404 }
    }

    const wavBytes = await callSynthesize({
      text: params.input,
      audioPromptPath,
      temperature: configManager.getNumber('generation_defaults.temperature', 0.8),
      exaggeration: configManager.getNumber('generation_defaults.exaggeration', 0.5),
      cfgWeight: configManager.getNumber('generation_defaults.cfg_weight', 0.5),
      seed: params.seed ?? configManager.getNumber('generation_defaults.seed', 0),
      language: configManager.getString('generation_defaults.language', 'en'),
    })

    const { audio: rawAudio, sampleRate } = decodeWav(wavBytes)

    let audio = rawAudio
    if ((params.speed ?? 1.0) !== 1.0) {
      audio = applySpeedFactor(audio, sampleRate, params.speed ?? 1.0)
    }

    audio = normalizeAudio(audio)
    const rawFormat = params.response_format ?? 'wav'
    const format = rawFormat === 'opus' ? 'wav' : rawFormat
    const audioBuffer = encodeAudio(audio, sampleRate, format)

    return {
      audio: audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
      content_type: `audio/${format}`,
      sample_rate: sampleRate,
      status: 200,
    }
  } catch (err) {
    return { error: `OpenAI speech request failed: ${err}`, status: 502 }
  }
}
