import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { TTSForm } from '~/components/tts-form'
import { AudioPlayer } from '~/components/audio-player'
import { ConfigPanel, ResetSettingsButton } from '~/components/config-panel'
import { TipsSection } from '~/components/tips-section'
import { LoadingOverlay } from '~/components/loading-overlay'
import { ChunkWarningModal } from '~/components/chunk-warning-modal'
import { GenerationWarningModal } from '~/components/generation-warning-modal'
import { useTtsGeneration } from '~/hooks/use-tts-generation'
import { useModelInfo } from '~/hooks/use-model-info'
import { useUiState } from '~/hooks/use-ui-state'
import { useTheme } from '~/hooks/use-theme'
import { getInitialData } from '~/server/functions/get-initial-data'
import { saveSettings } from '~/server/functions/save-settings'
import { resetSettings } from '~/server/functions/reset-settings'
import { restartServer } from '~/server/functions/restart-server'
import { getPredefinedVoices } from '~/server/functions/get-voices'
import { getReferenceFiles } from '~/server/functions/get-reference-files'
import { getModelInfoFn } from '~/server/functions/get-model-info'
import { generateTts } from '~/server/functions/generate-tts'
import { uploadPredefinedVoice, uploadReferenceFiles } from '~/server/functions/upload-files'
import type { InitialData, Voice, Preset, OutputFormat, VoiceMode } from '~/lib/types'

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

async function encodeUploadFiles(files: FileList): Promise<Array<{ name: string; data: string }>> {
  return Promise.all(
    Array.from(files).map(async (file) => ({
      name: file.name,
      data: await fileToBase64(file),
    })),
  )
}

export const Route = createFileRoute('/')({
  loader: async () => {
    return await getInitialData()
  },
  component: HomePage,
})

function HomePage() {
  const initialData = Route.useLoaderData() as InitialData

  // State
  const [voices, setVoices] = useState<Voice[]>(initialData.predefined_voices)
  const [referenceFiles, setReferenceFiles] = useState<string[]>(initialData.reference_files)
  const [hideChunkWarning, setHideChunkWarning] = useState(initialData.config.ui_state?.hide_chunk_warning ?? false)
  const [hideGenWarning, setHideGenWarning] = useState(initialData.config.ui_state?.hide_generation_warning ?? false)
  const [showChunkModal, setShowChunkModal] = useState(false)
  const [showGenModal, setShowGenModal] = useState(false)

  const { theme } = useTheme()
  const { modelInfo, showParalinguisticTags, updateModelInfo } = useModelInfo(initialData.model_info)

  const tts = useTtsGeneration()

  // Restore UI state from initial data
  useEffect(() => {
    tts.restoreFromUiState(initialData.config.ui_state, initialData.config.generation_defaults)
    if (initialData.config.audio_output?.format) {
      tts.setOutputFormat(initialData.config.audio_output.format as OutputFormat)
    }
  }, [])

  // UI state persistence
  const { saveState } = useUiState({
    onSave: async (data) => {
      await saveSettings({ data: data as Record<string, unknown> })
    },
    enabled: true,
  })

  // Debounced save on form changes
  useEffect(() => {
    saveState(tts.formState, theme, tts.activePreset, hideChunkWarning, hideGenWarning)
  }, [tts.formState, theme, tts.activePreset, hideChunkWarning, hideGenWarning, saveState])

  // Handlers
  const shouldShowChunkWarning = useCallback(() => (
      tts.formState.splitText
      && tts.formState.text.length >= tts.formState.chunkSize * 1.5
      && tts.formState.voiceMode === 'clone'
      && tts.formState.seed === 0
      && !hideChunkWarning
  ), [hideChunkWarning, tts.formState])

  const proceedToGenerate = useCallback(async () => {
    tts.setIsGenerating(true)
    const startTime = performance.now()

    try {
      const result = await generateTts({
        data: {
          text: tts.formState.text,
          voice_mode: tts.formState.voiceMode,
          predefined_voice_id: tts.formState.predefinedVoiceId ?? undefined,
          reference_audio_filename: tts.formState.referenceAudioFilename ?? undefined,
          output_format: tts.formState.outputFormat,
          split_text: tts.formState.splitText,
          chunk_size: tts.formState.chunkSize,
          temperature: tts.formState.temperature,
          exaggeration: tts.formState.exaggeration,
          cfg_weight: tts.formState.cfgWeight,
          speed_factor: tts.formState.speedFactor,
          seed: tts.formState.seed,
          language: tts.formState.language,
        },
      })

      const endTime = performance.now()
      const genTime = ((endTime - startTime) / 1000).toFixed(2)

      // Convert base64 audio to blob URL
      if (!result?.audio_base64) {
        throw new Error('Server returned no audio data')
      }
      const bytes = Uint8Array.from(atob(result.audio_base64), (c) => c.charCodeAt(0))
      const mimeType = `audio/${result.format}`
      const blob = new Blob([bytes], { type: mimeType })
      const audioUrl = URL.createObjectURL(blob)

      tts.setAudioResult({
        audioUrl,
        filename: result.filename,
        genTime,
        voiceMode: tts.formState.voiceMode,
        predefinedVoice: tts.formState.predefinedVoiceId ?? undefined,
        cloneFile: tts.formState.referenceAudioFilename ?? undefined,
      })

      toast.success('Audio generated successfully!')
    } catch (err) {
      toast.error(`Generation failed: ${err instanceof Error ? err.message : String(err)}`, { duration: 8000 })
    } finally {
      tts.setIsGenerating(false)
    }
  }, [tts.formState, tts.setAudioResult, tts.setIsGenerating])

  const handleGenerate = useCallback(() => {
    const error = tts.validate(modelInfo)
    if (error) {
      toast.error(error)
      return
    }

    if (!hideGenWarning) {
      setShowGenModal(true)
      return
    }

    if (shouldShowChunkWarning()) {
      setShowChunkModal(true)
      return
    }

    proceedToGenerate()
  }, [hideGenWarning, modelInfo, proceedToGenerate, shouldShowChunkWarning, tts.validate])

  const handleApplyModelChange = useCallback(async (selector: string) => {
    try {
      await saveSettings({ data: { model: { repo_id: selector } } })
      toast.info('Model configuration saved. Restarting...')
      const result = await restartServer()
      toast.success(result.message)
      const newModelInfo = await getModelInfoFn()
      updateModelInfo(newModelInfo)
    } catch (err) {
      toast.error(`Model change failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [updateModelInfo])

  const handleUploadPredefinedVoice = useCallback(async (files: FileList) => {
    toast.info(`Uploading ${files.length} file(s)...`)

    try {
      const result = await uploadPredefinedVoice({
        data: { files: await encodeUploadFiles(files) },
      })

      setVoices(result.all_predefined_voices)

      if (result.uploaded_files.length === 1) {
        tts.setPredefinedVoiceId(result.uploaded_files[0])
      }

      if (result.errors.length > 0) {
        toast.warning(`Uploaded ${result.uploaded_files.length} file(s) with ${result.errors.length} issue(s).`)
        return
      }

      toast.success(`Uploaded ${result.uploaded_files.length} predefined voice file(s).`)
    } catch (err) {
      toast.error(`Predefined voice upload failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [tts.setPredefinedVoiceId])

  const handleRefreshPredefinedVoices = useCallback(async () => {
    const refreshed = await getPredefinedVoices()
    setVoices(refreshed)
    toast.info('Predefined voices refreshed.')
  }, [])

  const handleUploadReferenceFile = useCallback(async (files: FileList) => {
    toast.info(`Uploading ${files.length} file(s)...`)

    try {
      const result = await uploadReferenceFiles({
        data: { files: await encodeUploadFiles(files) },
      })

      setReferenceFiles(result.all_reference_files)

      if (result.uploaded_files.length === 1) {
        tts.setReferenceAudioFilename(result.uploaded_files[0])
      }

      if (result.errors.length > 0) {
        toast.warning(`Uploaded ${result.uploaded_files.length} file(s) with ${result.errors.length} issue(s).`)
        return
      }

      toast.success(`Uploaded ${result.uploaded_files.length} reference file(s).`)
    } catch (err) {
      toast.error(`Reference file upload failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [tts.setReferenceAudioFilename])

  const handleRefreshReferenceFiles = useCallback(async () => {
    const refreshed = await getReferenceFiles()
    setReferenceFiles(refreshed)
    toast.info('Reference files refreshed.')
  }, [])

  const handleSelectPreset = useCallback((preset: Preset) => {
    tts.applyPreset(preset)
    toast.info(`Preset "${preset.name}" loaded.`)
  }, [])

  const handleSaveConfig = useCallback(async (partial: Record<string, unknown>) => {
    await saveSettings({ data: partial })
    toast.success('Configuration saved.')
  }, [])

  const handleResetSettings = useCallback(async () => {
    await resetSettings()
    toast.success('Settings reset to defaults. Reloading...')
    setTimeout(() => window.location.reload(), 2000)
  }, [])

  const handleRestartServer = useCallback(async () => {
    const result = await restartServer()
    toast.success(result.message)
    const newModelInfo = await getModelInfoFn()
    updateModelInfo(newModelInfo)
  }, [updateModelInfo])

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-6">
      <TTSForm
        formState={tts.formState}
        modelInfo={modelInfo}
        voices={voices}
        referenceFiles={referenceFiles}
        presets={initialData.presets}
        activePreset={tts.activePreset}
        isGenerating={tts.isGenerating}
        textareaRef={tts.textareaRef}
        showParalinguisticTags={showParalinguisticTags}
        onTextChange={tts.setText}
        onVoiceModeChange={tts.setVoiceMode as (mode: VoiceMode) => void}
        onPredefinedVoiceChange={tts.setPredefinedVoiceId}
        onReferenceFileChange={tts.setReferenceAudioFilename}
        onTemperatureChange={tts.setTemperature}
        onExaggerationChange={tts.setExaggeration}
        onCfgWeightChange={tts.setCfgWeight}
        onSpeedFactorChange={tts.setSpeedFactor}
        onSeedChange={tts.setSeed}
        onLanguageChange={tts.setLanguage}
        onOutputFormatChange={tts.setOutputFormat as (v: OutputFormat) => void}
        onSplitTextChange={tts.setSplitText}
        onChunkSizeChange={tts.setChunkSize}
        onSelectPreset={handleSelectPreset}
        onInsertTag={tts.insertTagAtCursor}
        onGenerate={handleGenerate}
        onApplyModelChange={handleApplyModelChange}
        onUploadPredefinedVoice={handleUploadPredefinedVoice}
        onRefreshPredefinedVoices={handleRefreshPredefinedVoices}
        onUploadReferenceFile={handleUploadReferenceFile}
        onRefreshReferenceFiles={handleRefreshReferenceFiles}
      />

      {/* Config Panel (inside the card) */}
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <ConfigPanel
            config={initialData.config}
            onSaveConfig={handleSaveConfig}
            onResetSettings={handleResetSettings}
            onRestartServer={handleRestartServer}
          />
        </div>
        <ResetSettingsButton onReset={handleResetSettings} />
      </div>

      {/* Audio Player */}
      {tts.audioResult && <AudioPlayer result={tts.audioResult} />}

      {/* Tips */}
      <TipsSection />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={tts.isGenerating}
        onCancel={() => tts.setIsGenerating(false)}
      />

      {/* Chunk Warning Modal */}
      <ChunkWarningModal
        open={showChunkModal}
        onCancel={() => setShowChunkModal(false)}
        onProceed={(dontShow) => {
          if (dontShow) setHideChunkWarning(true)
          setShowChunkModal(false)
          proceedToGenerate()
        }}
      />

      {/* Generation Warning Modal */}
      <GenerationWarningModal
        open={showGenModal}
        onAcknowledge={(dontShow) => {
          if (dontShow) setHideGenWarning(true)
          setShowGenModal(false)
          if (shouldShowChunkWarning()) {
            setShowChunkModal(true)
            return
          }
          proceedToGenerate()
        }}
      />
    </div>
  )
}
