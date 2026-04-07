import { createAPIFileRoute } from '@tanstack/react-start/api'
import { openAiSpeechRequestSchema } from '~/lib/schemas'
import { generateOpenAiSpeech } from '~/server/tts-proxy'

export const APIRoute = createAPIFileRoute('/api/v1/audio/speech')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const parsed = openAiSpeechRequestSchema.parse(body)
      const result = await generateOpenAiSpeech(parsed)

      if ('error' in result) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: result.status, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const headers = new Headers({ 'Content-Type': result.content_type })
      if (result.sample_rate) {
        headers.set('X-Sample-Rate', String(result.sample_rate))
      }

      return new Response(result.audio, { status: result.status, headers })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
  },
})
