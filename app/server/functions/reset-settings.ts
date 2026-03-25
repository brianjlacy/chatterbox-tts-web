import { createServerFn } from '@tanstack/react-start'
import { configManager } from '~/server/config-manager'
import type { UpdateStatusResponse } from '~/lib/types'

export const resetSettings = createServerFn({ method: 'POST' }).handler(
  async (): Promise<UpdateStatusResponse> => {
    const success = configManager.reset()

    if (!success) {
      throw new Error('Failed to reset configuration')
    }

    return {
      message: 'Configuration reset to defaults. Please reload the page.',
      restart_needed: true,
    }
  },
)
