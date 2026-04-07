import { useState, useCallback, useRef } from 'react'
import type { TTSFormState, AudioResult, Preset, ModelInfo, OutputFormat, VoiceMode } from '~/lib/types'
import { PARAM_RANGES } from '~/lib/constants'

const DEFAULT_FORM_STATE: TTSFormState = {
  text: '',
  voiceMode: 'predefined',
  predefinedVoiceId: null,
  referenceAudioFilename: null,
  temperature: PARAM_RANGES.temperature.default,
  exaggeration: PARAM_RANGES.exaggeration.default,
  cfgWeight: PARAM_RANGES.cfgWeight.default,
  speedFactor: PARAM_RANGES.speedFactor.default,
  seed: 0,
  language: 'en',
  outputFormat: 'wav',
  splitText: true,
  chunkSize: PARAM_RANGES.chunkSize.default,
}

export function useTtsGeneration(initialState?: Partial<TTSFormState>) {
  const [formState, setFormState] = useState<TTSFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialState,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const updateField = useCallback(<K extends keyof TTSFormState>(key: K, value: TTSFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setText = useCallback((text: string) => updateField('text', text), [updateField])
  const setVoiceMode = useCallback((mode: VoiceMode) => updateField('voiceMode', mode), [updateField])
  const setPredefinedVoiceId = useCallback((id: string | null) => updateField('predefinedVoiceId', id), [updateField])
  const setReferenceAudioFilename = useCallback((f: string | null) => updateField('referenceAudioFilename', f), [updateField])
  const setTemperature = useCallback((v: number) => updateField('temperature', v), [updateField])
  const setExaggeration = useCallback((v: number) => updateField('exaggeration', v), [updateField])
  const setCfgWeight = useCallback((v: number) => updateField('cfgWeight', v), [updateField])
  const setSpeedFactor = useCallback((v: number) => updateField('speedFactor', v), [updateField])
  const setSeed = useCallback((v: number) => updateField('seed', v), [updateField])
  const setLanguage = useCallback((v: string) => updateField('language', v), [updateField])
  const setOutputFormat = useCallback((v: OutputFormat) => updateField('outputFormat', v), [updateField])
  const setSplitText = useCallback((v: boolean) => updateField('splitText', v), [updateField])
  const setChunkSize = useCallback((v: number) => updateField('chunkSize', v), [updateField])

  const applyPreset = useCallback((preset: Preset) => {
    setFormState((prev) => ({
      ...prev,
      text: preset.text,
      temperature: preset.params.temperature ?? prev.temperature,
      exaggeration: preset.params.exaggeration ?? prev.exaggeration,
      cfgWeight: preset.params.cfg_weight ?? prev.cfgWeight,
      speedFactor: preset.params.speed_factor ?? prev.speedFactor,
      seed: preset.params.seed ?? prev.seed,
      language: preset.params.language ?? prev.language,
    }))
    setActivePreset(preset.name)
  }, [])

  const insertTagAtCursor = useCallback((tag: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setText(formState.text + tag)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = formState.text.substring(0, start)
    const after = formState.text.substring(end)
    const insertText = after.length > 0 && after[0] !== ' ' ? tag + ' ' : tag
    const newText = before + insertText + after

    setText(newText)

    requestAnimationFrame(() => {
      const newPos = start + insertText.length
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    })
  }, [formState.text, setText])

  const restoreFromUiState = useCallback((uiState: {
    last_text?: string
    last_voice_mode?: VoiceMode
    last_predefined_voice?: string
    last_reference_file?: string
    last_seed?: number
    last_chunk_size?: number
    last_split_text_enabled?: boolean
    last_preset_name?: string
  }, generationDefaults?: {
    temperature?: number
    exaggeration?: number
    cfg_weight?: number
    speed_factor?: number
    language?: string
  }) => {
    setFormState((prev) => ({
      ...prev,
      text: uiState.last_text ?? prev.text,
      voiceMode: uiState.last_voice_mode ?? prev.voiceMode,
      predefinedVoiceId: uiState.last_predefined_voice ?? prev.predefinedVoiceId,
      referenceAudioFilename: uiState.last_reference_file ?? prev.referenceAudioFilename,
      seed: uiState.last_seed ?? prev.seed,
      chunkSize: uiState.last_chunk_size ?? prev.chunkSize,
      splitText: uiState.last_split_text_enabled ?? prev.splitText,
      temperature: generationDefaults?.temperature ?? prev.temperature,
      exaggeration: generationDefaults?.exaggeration ?? prev.exaggeration,
      cfgWeight: generationDefaults?.cfg_weight ?? prev.cfgWeight,
      speedFactor: generationDefaults?.speed_factor ?? prev.speedFactor,
      language: generationDefaults?.language ?? prev.language,
    }))
    if (uiState.last_preset_name) {
      setActivePreset(uiState.last_preset_name)
    }
  }, [])

  const validate = useCallback((modelInfo: ModelInfo | null): string | null => {
    if (!formState.text.trim()) return 'Please enter some text to generate speech.'
    if (formState.voiceMode === 'predefined' && !formState.predefinedVoiceId) return 'Please select a predefined voice.'
    if (formState.voiceMode === 'clone' && !formState.referenceAudioFilename) return 'Please select a reference audio file for Voice Cloning.'
    if (!modelInfo?.loaded) return 'TTS model is not loaded.'
    return null
  }, [formState])

  return {
    formState,
    isGenerating,
    setIsGenerating,
    audioResult,
    setAudioResult,
    activePreset,
    textareaRef,
    setText,
    setVoiceMode,
    setPredefinedVoiceId,
    setReferenceAudioFilename,
    setTemperature,
    setExaggeration,
    setCfgWeight,
    setSpeedFactor,
    setSeed,
    setLanguage,
    setOutputFormat,
    setSplitText,
    setChunkSize,
    applyPreset,
    insertTagAtCursor,
    restoreFromUiState,
    validate,
  }
}
