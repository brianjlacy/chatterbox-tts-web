import { createServerFn } from '@tanstack/react-start'
import { listPredefinedVoices } from '~/server/file-manager'
import type { Voice } from '~/lib/types'

export const getPredefinedVoices = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Voice[]> => {
    return listPredefinedVoices()
  },
)
