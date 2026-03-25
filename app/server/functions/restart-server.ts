import { createServerFn } from '@tanstack/react-start'
import { reloadModel, getModelInfo } from '~/server/tts-proxy'
import type { UpdateStatusResponse } from '~/lib/types'

export const restartServer = createServerFn({ method: 'POST' }).handler(
  async (): Promise<UpdateStatusResponse> => {
    const result = await reloadModel()

    if (!result.success) {
      throw new Error(result.message)
    }

    const modelInfo = await getModelInfo()
    const modelName = modelInfo.class_name || 'Unknown Model'
    const modelType = modelInfo.type || 'unknown'

    return {
      message: `Model hot-swap successful. Now running: ${modelName} (${modelType})`,
      restart_needed: false,
    }
  },
)
