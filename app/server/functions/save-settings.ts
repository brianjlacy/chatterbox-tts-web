import { createServerFn } from '@tanstack/react-start'
import { configManager } from '~/server/config-manager'
import type { DeepPartial, AppConfig, UpdateStatusResponse } from '~/lib/types'

export const saveSettings = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as DeepPartial<AppConfig>)
  .handler(async ({ data }): Promise<UpdateStatusResponse> => {
    const success = configManager.update(data)

    if (!success) {
      throw new Error('Failed to save configuration')
    }

    const restartNeeded = Boolean(
      data.server || data.tts_engine || data.paths || data.model,
    )

    return {
      message: restartNeeded
        ? 'Settings saved. A server restart may be required for some changes.'
        : 'Settings saved successfully.',
      restart_needed: restartNeeded,
    }
  })
