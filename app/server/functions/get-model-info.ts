import { createServerFn } from '@tanstack/react-start'
import { getModelInfo as proxyGetModelInfo } from '~/server/tts-proxy'
import type { ModelInfo } from '~/lib/types'

export const getModelInfoFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ModelInfo> => {
    return await proxyGetModelInfo()
  },
)
