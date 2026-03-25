import { createServerFn } from '@tanstack/react-start'
import { configManager } from '~/server/config-manager'
import { listPredefinedVoices, listReferenceFiles } from '~/server/file-manager'
import { loadPresets } from '~/server/preset-loader'
import { getModelInfo } from '~/server/tts-proxy'
import type { InitialData } from '~/lib/types'

export const getInitialData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<InitialData> => {
    const config = configManager.getConfig()
    const predefinedVoices = listPredefinedVoices()
    const referenceFiles = listReferenceFiles()
    const presets = loadPresets()
    const modelInfo = await getModelInfo()

    return {
      config,
      reference_files: referenceFiles,
      predefined_voices: predefinedVoices,
      presets,
      model_info: modelInfo,
    }
  },
)
