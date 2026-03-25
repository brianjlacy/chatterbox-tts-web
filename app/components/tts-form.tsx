import { Volume2 } from 'lucide-react'
import { ModelSelector } from './model-selector'
import { TextInput } from './text-input'
import { ParalinguisticTags } from './paralinguistic-tags'
import { ChunkControls } from './chunk-controls'
import { VoiceSelector } from './voice-selector'
import { PredefinedVoices } from './predefined-voices'
import { CloneVoices } from './clone-voices'
import { PresetButtons } from './preset-buttons'
import { GenerationParams } from './generation-params'
import { LanguageSelect } from './language-select'
import { OutputFormat } from './output-format'
import type { ModelInfo, Voice, Preset, TTSFormState, VoiceMode, OutputFormat as OutputFormatType } from '~/lib/types'

interface TTSFormProps {
  formState: TTSFormState
  modelInfo: ModelInfo | null
  voices: Voice[]
  referenceFiles: string[]
  presets: Preset[]
  activePreset: string | null
  isGenerating: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  showParalinguisticTags: boolean

  // Form field handlers
  onTextChange: (text: string) => void
  onVoiceModeChange: (mode: VoiceMode) => void
  onPredefinedVoiceChange: (id: string | null) => void
  onReferenceFileChange: (filename: string | null) => void
  onTemperatureChange: (v: number) => void
  onExaggerationChange: (v: number) => void
  onCfgWeightChange: (v: number) => void
  onSpeedFactorChange: (v: number) => void
  onSeedChange: (v: number) => void
  onLanguageChange: (v: string) => void
  onOutputFormatChange: (v: OutputFormatType) => void
  onSplitTextChange: (v: boolean) => void
  onChunkSizeChange: (v: number) => void
  onSelectPreset: (preset: Preset) => void
  onInsertTag: (tag: string) => void
  onGenerate: () => void
  onApplyModelChange: (selector: string) => Promise<void>

  // File management
  onUploadPredefinedVoice: (files: FileList) => void
  onRefreshPredefinedVoices: () => void
  onUploadReferenceFile: (files: FileList) => void
  onRefreshReferenceFiles: () => void
}

export function TTSForm({
  formState,
  modelInfo,
  voices,
  referenceFiles,
  presets,
  activePreset,
  isGenerating,
  textareaRef,
  showParalinguisticTags,
  onTextChange,
  onVoiceModeChange,
  onPredefinedVoiceChange,
  onReferenceFileChange,
  onTemperatureChange,
  onExaggerationChange,
  onCfgWeightChange,
  onSpeedFactorChange,
  onSeedChange,
  onLanguageChange,
  onOutputFormatChange,
  onSplitTextChange,
  onChunkSizeChange,
  onSelectPreset,
  onInsertTag,
  onGenerate,
  onApplyModelChange,
  onUploadPredefinedVoice,
  onRefreshPredefinedVoices,
  onUploadReferenceFile,
  onRefreshReferenceFiles,
}: TTSFormProps) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="space-y-6 p-6">
        <h2 className="text-xl font-semibold">Generate Speech</h2>

        {/* Model Selection */}
        <ModelSelector modelInfo={modelInfo} onApplyChange={onApplyModelChange} />

        {/* Text Input */}
        <div ref={textareaRef as React.RefObject<HTMLDivElement>}>
          <TextInput value={formState.text} onChange={onTextChange} />
        </div>

        {/* Paralinguistic Tags (Turbo only) */}
        <ParalinguisticTags visible={showParalinguisticTags} onInsertTag={onInsertTag} />

        {/* Generate Button + Chunk Controls */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Speech'}
            </button>
            <ChunkControls
              splitText={formState.splitText}
              chunkSize={formState.chunkSize}
              onSplitTextChange={onSplitTextChange}
              onChunkSizeChange={onChunkSizeChange}
            />
          </div>
        </div>

        {/* Voice Selection */}
        <VoiceSelector voiceMode={formState.voiceMode} onVoiceModeChange={onVoiceModeChange}>
          {formState.voiceMode === 'predefined' ? (
            <PredefinedVoices
              voices={voices}
              selectedVoice={formState.predefinedVoiceId}
              onVoiceChange={onPredefinedVoiceChange}
              onUpload={onUploadPredefinedVoice}
              onRefresh={onRefreshPredefinedVoices}
            />
          ) : (
            <CloneVoices
              referenceFiles={referenceFiles}
              selectedFile={formState.referenceAudioFilename}
              onFileChange={onReferenceFileChange}
              onUpload={onUploadReferenceFile}
              onRefresh={onRefreshReferenceFiles}
            />
          )}
        </VoiceSelector>

        {/* Presets */}
        <PresetButtons
          presets={presets}
          activePreset={activePreset}
          modelType={modelInfo?.type ?? null}
          onSelectPreset={onSelectPreset}
        />

        {/* Generation Parameters (Collapsible) */}
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between rounded-md py-2 text-sm font-medium text-foreground hover:text-foreground/80">
            <span>Generation Parameters</span>
            <svg
              className="h-4 w-4 transition-transform group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="mt-4 space-y-4">
            <GenerationParams
              temperature={formState.temperature}
              exaggeration={formState.exaggeration}
              cfgWeight={formState.cfgWeight}
              speedFactor={formState.speedFactor}
              seed={formState.seed}
              modelType={modelInfo?.type ?? null}
              onTemperatureChange={onTemperatureChange}
              onExaggerationChange={onExaggerationChange}
              onCfgWeightChange={onCfgWeightChange}
              onSpeedFactorChange={onSpeedFactorChange}
              onSeedChange={onSeedChange}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LanguageSelect
                language={formState.language}
                modelType={modelInfo?.type ?? null}
                onChange={onLanguageChange}
              />
              <OutputFormat
                format={formState.outputFormat}
                onChange={onOutputFormatChange}
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
