import { createServerFn } from '@tanstack/react-start'
import { ttsRequestSchema } from '~/lib/schemas'
import { configManager } from '~/server/config-manager'
import { getVoicesPath, getReferenceAudioPath, validateAudioFile } from '~/server/file-manager'
import { synthesize } from '~/server/tts-proxy'
import { stitchAudioSegments, normalizeAudio } from '~/server/audio-processing'
import path from 'node:path'

/**
 * Split text into sentences/chunks for processing.
 * Simple sentence-based splitting by punctuation.
 */
function chunkText(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize * 1.5) return [text]

  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
    currentChunk += (currentChunk ? ' ' : '') + sentence
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

export const generateTts = createServerFn({ method: 'POST' })
  .validator((data: unknown) => ttsRequestSchema.parse(data))
  .handler(async ({ data }) => {
    // Resolve voice file path
    let audioPromptPath: string | undefined

    if (data.voice_mode === 'predefined' && data.predefined_voice_id) {
      const voicePath = path.join(getVoicesPath(), data.predefined_voice_id)
      const validation = validateAudioFile(voicePath)
      if (!validation.valid) {
        throw new Error(`Invalid predefined voice: ${validation.message}`)
      }
      audioPromptPath = voicePath
    } else if (data.voice_mode === 'clone' && data.reference_audio_filename) {
      const refPath = path.join(getReferenceAudioPath(), data.reference_audio_filename)
      const validation = validateAudioFile(refPath)
      if (!validation.valid) {
        throw new Error(`Invalid reference audio: ${validation.message}`)
      }
      audioPromptPath = refPath
    }

    // Split text into chunks
    const textChunks = data.split_text
      ? chunkText(data.text, data.chunk_size)
      : [data.text]

    // Synthesize each chunk
    const audioSegments: Float32Array[] = []
    let sampleRate = 24000

    for (let i = 0; i < textChunks.length; i++) {
      const result = await synthesize({
        text: textChunks[i],
        audio_prompt_path: audioPromptPath,
        temperature: data.temperature,
        exaggeration: data.exaggeration,
        cfg_weight: data.cfg_weight,
        seed: data.seed,
        language: data.language,
      })

      if ('error' in result) {
        throw new Error(`Chunk ${i + 1}/${textChunks.length}: ${result.error}`)
      }

      sampleRate = result.sample_rate
      audioSegments.push(new Float32Array(result.audio))
    }

    if (audioSegments.length === 0) {
      throw new Error('No audio segments generated')
    }

    // Stitch segments
    const enableCrossfade = configManager.getBool('audio_processing.enable_crossfade', true)
    let finalAudio = stitchAudioSegments(audioSegments, sampleRate, enableCrossfade)

    // Normalize
    finalAudio = normalizeAudio(finalAudio)

    // Convert to base64 for transport (the client will create a blob)
    const buffer = Buffer.from(finalAudio.buffer)
    const base64 = buffer.toString('base64')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `tts_output_${timestamp}.${data.output_format}`

    return {
      audio_base64: base64,
      filename,
      sample_rate: sampleRate,
      format: data.output_format,
      chunks_processed: textChunks.length,
    }
  })
