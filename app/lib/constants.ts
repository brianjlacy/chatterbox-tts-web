import type { AppConfig } from './types'

export const LANGUAGES_MULTILINGUAL = [
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'en', name: 'English' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'he', name: 'Hebrew (עברית)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ms', name: 'Malay (Bahasa Melayu)' },
  { code: 'no', name: 'Norwegian (Norsk)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'sw', name: 'Swahili (Kiswahili)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
] as const

export const LANGUAGES_ENGLISH_ONLY = [
  { code: 'en', name: 'English' },
] as const

export const PARALINGUISTIC_TAGS = [
  { tag: '[laugh]', emoji: '😄', label: 'laugh' },
  { tag: '[chuckle]', emoji: '😊', label: 'chuckle' },
  { tag: '[sigh]', emoji: '😮‍💨', label: 'sigh' },
  { tag: '[gasp]', emoji: '😲', label: 'gasp' },
  { tag: '[cough]', emoji: '🤧', label: 'cough' },
  { tag: '[clear throat]', emoji: '🗣️', label: 'clear throat' },
  { tag: '[sniff]', emoji: '👃', label: 'sniff' },
  { tag: '[groan]', emoji: '😩', label: 'groan' },
  { tag: '[shush]', emoji: '🤫', label: 'shush' },
] as const

export const MODEL_OPTIONS = [
  { value: 'chatterbox-turbo' as const, label: 'Chatterbox Turbo (Fast, English)' },
  { value: 'chatterbox' as const, label: 'Chatterbox Original (English)' },
  { value: 'chatterbox-multilingual' as const, label: 'Chatterbox Multilingual (23 Languages)' },
] as const

export const OUTPUT_FORMATS = [
  { value: 'wav' as const, label: 'WAV' },
  { value: 'mp3' as const, label: 'MP3' },
  { value: 'opus' as const, label: 'Opus' },
] as const

export const PARAM_RANGES = {
  temperature: { min: 0, max: 1.5, step: 0.01, default: 0.8 },
  exaggeration: { min: 0.25, max: 2.0, step: 0.01, default: 0.5 },
  cfgWeight: { min: 0.2, max: 1.0, step: 0.01, default: 0.5 },
  speedFactor: { min: 0.25, max: 4.0, step: 0.05, default: 1.0 },
  chunkSize: { min: 50, max: 500, step: 10, default: 120 },
} as const

export const DEBOUNCE_DELAY_MS = 750

export const DEFAULT_CONFIG: AppConfig = {
  server: {
    host: '0.0.0.0',
    port: 8004,
    python_engine_url: 'http://localhost:8005',
    log_file_path: 'logs/tts_server.log',
    log_file_max_size_mb: 10,
    log_file_backup_count: 5,
  },
  model: {
    repo_id: 'chatterbox-turbo',
  },
  tts_engine: {
    device: 'auto',
    predefined_voices_path: 'voices',
    reference_audio_path: 'reference_audio',
    default_voice_id: 'Emily.wav',
  },
  paths: {
    model_cache: 'model_cache',
    output: 'outputs',
  },
  generation_defaults: {
    temperature: 0.8,
    exaggeration: 0.5,
    cfg_weight: 0.5,
    seed: 0,
    speed_factor: 1.0,
    language: 'en',
  },
  audio_output: {
    format: 'wav',
    sample_rate: 24000,
    max_reference_duration_sec: 30,
    save_to_disk: false,
  },
  audio_processing: {
    enable_crossfade: true,
    enable_silence_trimming: false,
    enable_internal_silence_fix: false,
    enable_unvoiced_removal: false,
  },
  ui_state: {
    last_text: '',
    last_voice_mode: 'predefined',
    last_predefined_voice: 'Emily.wav',
    last_reference_file: '',
    last_seed: 0,
    last_chunk_size: 240,
    last_split_text_enabled: true,
    theme: 'dark',
    last_preset_name: '',
    hide_chunk_warning: false,
    hide_generation_warning: false,
  },
  ui: {
    title: 'Chatterbox TTS Server',
    show_language_select: true,
    max_predefined_voices_in_dropdown: 50,
  },
}

/** Map model selector value to model type */
export function selectorToModelType(selector: string): 'original' | 'turbo' | 'multilingual' {
  switch (selector) {
    case 'chatterbox-turbo': return 'turbo'
    case 'chatterbox-multilingual': return 'multilingual'
    default: return 'original'
  }
}

/** Map model type to selector value */
export function modelTypeToSelector(type: string): string {
  switch (type) {
    case 'turbo': return 'chatterbox-turbo'
    case 'multilingual': return 'chatterbox-multilingual'
    default: return 'chatterbox'
  }
}
