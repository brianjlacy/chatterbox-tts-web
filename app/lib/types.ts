export type VoiceMode = 'predefined' | 'clone'
export type OutputFormat = 'wav' | 'mp3' | 'opus'
export type ModelType = 'original' | 'turbo' | 'multilingual'
export type ModelSelector = 'chatterbox' | 'chatterbox-turbo' | 'chatterbox-multilingual'
export type ThemeMode = 'dark' | 'light'

export interface ModelInfo {
  loaded: boolean
  class_name: string
  type: ModelType
  device: string
  supports_paralinguistic_tags: boolean
  supported_languages?: string[]
}

export interface Voice {
  filename: string
  display_name: string
}

export interface Preset {
  name: string
  text: string
  params: GenerationParamsPartial
}

export interface GenerationParamsPartial {
  temperature?: number
  exaggeration?: number
  cfg_weight?: number
  seed?: number
  speed_factor?: number
  language?: string
  voice_id?: string
  reference_audio_filename?: string
}

export interface GenerationDefaults {
  temperature: number
  exaggeration: number
  cfg_weight: number
  seed: number
  speed_factor: number
  language: string
}

export interface AudioOutputConfig {
  format: OutputFormat
  sample_rate: number
  max_reference_duration_sec: number
  save_to_disk: boolean
}

export interface ServerConfig {
  host: string
  port: number
  python_engine_url?: string
  use_ngrok?: boolean
  use_auth?: boolean
  log_file_path: string
  log_file_max_size_mb: number
  log_file_backup_count: number
}

export interface TtsEngineConfig {
  device: string
  predefined_voices_path: string
  reference_audio_path: string
  default_voice_id: string
}

export interface PathsConfig {
  model_cache: string
  output: string
}

export interface ModelConfig {
  repo_id: string
}

export interface UiStateConfig {
  last_text: string
  last_voice_mode: VoiceMode
  last_predefined_voice: string
  last_reference_file: string
  last_seed: number
  last_chunk_size: number
  last_split_text_enabled: boolean
  theme: ThemeMode
  last_preset_name: string
  hide_chunk_warning: boolean
  hide_generation_warning: boolean
}

export interface UiConfig {
  title: string
  show_language_select: boolean
  max_predefined_voices_in_dropdown: number
}

export interface AudioProcessingConfig {
  enable_crossfade: boolean
  enable_silence_trimming: boolean
  enable_internal_silence_fix: boolean
  enable_unvoiced_removal: boolean
}

export interface AppConfig {
  server: ServerConfig
  model: ModelConfig
  tts_engine: TtsEngineConfig
  paths: PathsConfig
  generation_defaults: GenerationDefaults
  audio_output: AudioOutputConfig
  audio_processing?: AudioProcessingConfig
  ui_state: UiStateConfig
  ui: UiConfig
}

export interface InitialData {
  config: AppConfig
  reference_files: string[]
  predefined_voices: Voice[]
  presets: Preset[]
  model_info: ModelInfo
}

export interface TTSFormState {
  text: string
  voiceMode: VoiceMode
  predefinedVoiceId: string | null
  referenceAudioFilename: string | null
  temperature: number
  exaggeration: number
  cfgWeight: number
  speedFactor: number
  seed: number
  language: string
  outputFormat: OutputFormat
  splitText: boolean
  chunkSize: number
}

export interface TTSRequest {
  text: string
  voice_mode: VoiceMode
  predefined_voice_id?: string
  reference_audio_filename?: string
  output_format: OutputFormat
  split_text: boolean
  chunk_size: number
  temperature: number
  exaggeration: number
  cfg_weight: number
  speed_factor: number
  seed: number
  language: string
}

export interface AudioResult {
  audioUrl: string
  filename: string
  genTime: string
  voiceMode: VoiceMode
  predefinedVoice?: string
  cloneFile?: string
}

export interface UpdateStatusResponse {
  message: string
  restart_needed: boolean
}

export interface OpenAISpeechRequest {
  model: string
  input: string
  voice: string
  response_format?: OutputFormat
  speed?: number
  seed?: number
}

/** Deep partial utility type for config updates */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
