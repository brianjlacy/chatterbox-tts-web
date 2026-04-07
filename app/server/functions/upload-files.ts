import { createServerFn } from '@tanstack/react-start'
import { saveUploadedFile, getVoicesPath, getReferenceAudioPath, listPredefinedVoices, listReferenceFiles } from '~/server/file-manager'
import type { Voice } from '~/lib/types'

interface UploadResult {
  message: string
  uploaded_files: string[]
  errors: Array<{ filename: string; error: string }>
}

interface UploadReferenceResult extends UploadResult {
  all_reference_files: string[]
}

interface UploadVoiceResult extends UploadResult {
  all_predefined_voices: Voice[]
}

export const uploadReferenceFiles = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { files: Array<{ name: string; data: string }> })
  .handler(async ({ data }): Promise<UploadReferenceResult> => {
    const targetDir = getReferenceAudioPath()
    const uploadedFiles: string[] = []
    const errors: Array<{ filename: string; error: string }> = []

    for (const file of data.files) {
      const buffer = Buffer.from(file.data, 'base64')
      const result = await saveUploadedFile(buffer, file.name, targetDir)
      if (result.error) {
        errors.push({ filename: result.filename, error: result.error })
      } else {
        uploadedFiles.push(result.filename)
      }
    }

    return {
      message: `Processed ${data.files.length} file(s).`,
      uploaded_files: uploadedFiles,
      errors,
      all_reference_files: listReferenceFiles(),
    }
  })

export const uploadPredefinedVoice = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { files: Array<{ name: string; data: string }> })
  .handler(async ({ data }): Promise<UploadVoiceResult> => {
    const targetDir = getVoicesPath()
    const uploadedFiles: string[] = []
    const errors: Array<{ filename: string; error: string }> = []

    for (const file of data.files) {
      const buffer = Buffer.from(file.data, 'base64')
      const result = await saveUploadedFile(buffer, file.name, targetDir)
      if (result.error) {
        errors.push({ filename: result.filename, error: result.error })
      } else {
        uploadedFiles.push(result.filename)
      }
    }

    return {
      message: `Processed ${data.files.length} predefined voice file(s).`,
      uploaded_files: uploadedFiles,
      errors,
      all_predefined_voices: listPredefinedVoices(),
    }
  })
