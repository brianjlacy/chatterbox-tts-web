import { createAPIFileRoute } from '@tanstack/react-start/api'
import { openAiSpeechRequestSchema } from '~/lib/schemas'
import { configManager } from '~/server/config-manager'
import { getVoicesPath, getReferenceAudioPath, validateAudioFile } from '~/server/file-manager'
import { synthesize } from '~/server/tts-proxy'
import path from 'node:path'

export const APIRoute = createAPIFileRoute('/api/v1/audio/speech')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const parsed = openAiSpeechRequestSchema.parse(body)

      // Resolve voice file
      const voicesDir = getVoicesPath()
      const refDir = getReferenceAudioPath()
      let audioPromptPath: string | undefined

      const predefinedPath = path.join(voicesDir, parsed.voice)
      const referencePath = path.join(refDir, parsed.voice)

      if (validateAudioFile(predefinedPath).valid) {
        audioPromptPath = predefinedPath
      } else if (validateAudioFile(referencePath).valid) {
        audioPromptPath = referencePath
      } else {
        return new Response(
          JSON.stringify({ error: `Voice file '${parsed.voice}' not found.` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      // Synthesize
      const defaults = configManager.getConfig().generation_defaults
      const result = await synthesize({
        text: parsed.input,
        audio_prompt_path: audioPromptPath,
        temperature: defaults.temperature,
        exaggeration: defaults.exaggeration,
        cfg_weight: defaults.cfg_weight,
        seed: parsed.seed ?? defaults.seed,
        language: defaults.language,
      })

      if ('error' in result) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const mimeType = `audio/${parsed.response_format}`
      return new Response(result.audio, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'X-Sample-Rate': String(result.sample_rate),
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
  },
})
