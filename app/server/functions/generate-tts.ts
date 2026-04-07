import { createServerFn } from '@tanstack/react-start'
import { ttsRequestSchema } from '~/lib/schemas'
import { generateSpeech } from '~/server/tts-proxy'

export const generateTts = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => ttsRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const result = await generateSpeech(data)

    if ('error' in result) {
      throw new Error(result.error)
    }

    const buffer = Buffer.from(result.audio)
    const base64 = buffer.toString('base64')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = result.filename ?? `tts_output_${timestamp}.${data.output_format}`

    return {
      audio_base64: base64,
      filename,
      sample_rate: result.sample_rate,
      format: result.content_type.split('/')[1],
      chunks_processed: result.chunks_processed ?? 1,
    }
  })
