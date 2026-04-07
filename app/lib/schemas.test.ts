import { describe, it, expect } from 'vitest'
import { ttsRequestSchema, openAiSpeechRequestSchema } from './schemas'

describe('ttsRequestSchema', () => {
  it('validates a minimal valid request', () => {
    const result = ttsRequestSchema.parse({
      text: 'Hello world',
      voice_mode: 'predefined',
    })
    expect(result.text).toBe('Hello world')
    expect(result.voice_mode).toBe('predefined')
    expect(result.temperature).toBe(0.8)
    expect(result.output_format).toBe('wav')
  })

  it('rejects empty text', () => {
    expect(() =>
      ttsRequestSchema.parse({ text: '', voice_mode: 'predefined' }),
    ).toThrow()
  })

  it('rejects invalid voice_mode', () => {
    expect(() =>
      ttsRequestSchema.parse({ text: 'test', voice_mode: 'invalid' }),
    ).toThrow()
  })

  it('validates full request with all fields', () => {
    const result = ttsRequestSchema.parse({
      text: 'Hello world',
      voice_mode: 'clone',
      reference_audio_filename: 'ref.wav',
      output_format: 'mp3',
      split_text: false,
      chunk_size: 200,
      temperature: 0.5,
      exaggeration: 1.0,
      cfg_weight: 0.7,
      speed_factor: 1.5,
      seed: 42,
      language: 'en',
    })
    expect(result.output_format).toBe('mp3')
    expect(result.seed).toBe(42)
  })

  it('clamps temperature within range', () => {
    expect(() =>
      ttsRequestSchema.parse({ text: 'test', voice_mode: 'predefined', temperature: 2.0 }),
    ).toThrow()
  })

  it('rejects chunk sizes above the Python server limit', () => {
    expect(() =>
      ttsRequestSchema.parse({ text: 'test', voice_mode: 'predefined', chunk_size: 800 }),
    ).toThrow()
  })
})

describe('openAiSpeechRequestSchema', () => {
  it('validates a minimal request', () => {
    const result = openAiSpeechRequestSchema.parse({
      model: 'chatterbox-turbo',
      input: 'Hello',
      voice: 'Emily.wav',
    })
    expect(result.model).toBe('chatterbox-turbo')
    expect(result.response_format).toBe('wav')
    expect(result.speed).toBe(1.0)
  })

  it('rejects empty input', () => {
    expect(() =>
      openAiSpeechRequestSchema.parse({
        model: 'chatterbox',
        input: '',
        voice: 'Emily.wav',
      }),
    ).toThrow()
  })
})
