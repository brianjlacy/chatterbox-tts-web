import { createServerFn } from '@tanstack/react-start'
import { listReferenceFiles } from '~/server/file-manager'

export const getReferenceFiles = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string[]> => {
    return listReferenceFiles()
  },
)
