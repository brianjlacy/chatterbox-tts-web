import { useRef, useCallback } from 'react'
import type { TTSFormState, ThemeMode } from '~/lib/types'
import { DEBOUNCE_DELAY_MS } from '~/lib/constants'

interface UseUiStateOptions {
  onSave: (uiState: Record<string, unknown>) => Promise<void>
  enabled: boolean
}

export function useUiState({ onSave, enabled }: UseUiStateOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveState = useCallback((formState: TTSFormState, theme: ThemeMode, activePreset: string | null, hideChunkWarning: boolean, hideGenerationWarning: boolean) => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave({
          ui_state: {
            last_text: formState.text,
            last_voice_mode: formState.voiceMode,
            last_predefined_voice: formState.predefinedVoiceId ?? '',
            last_reference_file: formState.referenceAudioFilename ?? '',
            last_seed: formState.seed,
            last_chunk_size: formState.chunkSize,
            last_split_text_enabled: formState.splitText,
            theme,
            last_preset_name: activePreset ?? '',
            hide_chunk_warning: hideChunkWarning,
            hide_generation_warning: hideGenerationWarning,
          },
        })
      } catch (err) {
        console.error('[useUiState] Error saving UI state:', err)
      }
    }, DEBOUNCE_DELAY_MS)
  }, [onSave, enabled])

  return { saveState }
}
