import { z } from 'zod'

export const ttsRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voice_mode: z.enum(['predefined', 'clone']),
  predefined_voice_id: z.string().optional(),
  reference_audio_filename: z.string().optional(),
  output_format: z.enum(['wav', 'mp3', 'opus']).default('wav'),
  split_text: z.boolean().default(true),
  chunk_size: z.number().int().min(50).max(1000).default(120),
  temperature: z.number().min(0).max(1.5).default(0.8),
  exaggeration: z.number().min(0).max(2.0).default(0.5),
  cfg_weight: z.number().min(0).max(2.0).default(0.5),
  speed_factor: z.number().min(0.25).max(4.0).default(1.0),
  seed: z.number().int().min(0).default(0),
  language: z.string().default('en'),
})

export const openAiSpeechRequestSchema = z.object({
  model: z.string(),
  input: z.string().min(1),
  voice: z.string(),
  response_format: z.enum(['wav', 'mp3', 'opus']).default('wav'),
  speed: z.number().min(0.25).max(4.0).default(1.0),
  seed: z.number().int().optional(),
})

export const saveSettingsSchema = z.record(z.string(), z.unknown())

export type TTSRequestInput = z.infer<typeof ttsRequestSchema>
export type OpenAISpeechRequestInput = z.infer<typeof openAiSpeechRequestSchema>
