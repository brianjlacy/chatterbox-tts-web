import { useState, useCallback } from 'react'
import type { ModelInfo, ModelType } from '~/lib/types'

export function useModelInfo(initialModelInfo: ModelInfo | null = null) {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(initialModelInfo)

  const modelType: ModelType | null = modelInfo?.type ?? null
  const isTurbo = modelType === 'turbo'
  const isMultilingual = modelType === 'multilingual'
  const showParalinguisticTags = isTurbo && (modelInfo?.supports_paralinguistic_tags ?? false)
  const showLanguageSelect = isMultilingual

  const updateModelInfo = useCallback((info: ModelInfo) => {
    setModelInfo(info)
  }, [])

  return {
    modelInfo,
    modelType,
    isTurbo,
    isMultilingual,
    showParalinguisticTags,
    showLanguageSelect,
    updateModelInfo,
  }
}
