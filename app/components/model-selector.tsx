import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { MODEL_OPTIONS } from '~/lib/constants'
import type { ModelInfo } from '~/lib/types'
import { cn } from '~/lib/utils'

interface ModelSelectorProps {
  modelInfo: ModelInfo | null
  onApplyChange: (selector: string) => Promise<void>
}

export function ModelSelector({ modelInfo, onApplyChange }: ModelSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    if (!modelInfo) return 'chatterbox-turbo'
    switch (modelInfo.type) {
      case 'turbo': return 'chatterbox-turbo'
      case 'multilingual': return 'chatterbox-multilingual'
      default: return 'chatterbox'
    }
  })
  const [isPending, setIsPending] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const currentSelector = modelInfo
    ? modelInfo.type === 'turbo' ? 'chatterbox-turbo'
      : modelInfo.type === 'multilingual' ? 'chatterbox-multilingual'
        : 'chatterbox'
    : null

  const hasChange = currentSelector !== null && selectedValue !== currentSelector

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedValue(e.target.value)
    setIsPending(true)
  }

  async function handleApply() {
    setIsApplying(true)
    try {
      await onApplyChange(selectedValue)
    } finally {
      setIsApplying(false)
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="model-select" className="text-sm font-medium text-foreground">
            Active Model:
          </label>
          <select
            id="model-select"
            value={selectedValue}
            onChange={handleChange}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'h-2 w-2 rounded-full',
            !modelInfo ? 'bg-gray-400' :
            hasChange ? 'bg-yellow-500' :
            modelInfo.loaded ? 'bg-green-500' : 'bg-red-500',
          )} />
          <span className="text-xs text-muted-foreground">
            {!modelInfo ? 'Checking model...' :
             hasChange ? 'Model change pending — click Apply & Restart' :
             modelInfo.loaded ? `${modelInfo.class_name} loaded on ${modelInfo.device}` :
             'Model not loaded'}
          </span>
        </div>

        {(hasChange || isPending) && (
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isApplying && 'animate-spin')} />
            {isApplying ? 'Applying...' : 'Apply & Restart'}
          </button>
        )}
      </div>
    </div>
  )
}
