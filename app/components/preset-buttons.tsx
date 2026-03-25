import type { Preset, ModelType } from '~/lib/types'
import { cn } from '~/lib/utils'

interface PresetButtonsProps {
  presets: Preset[]
  activePreset: string | null
  modelType: ModelType | null
  onSelectPreset: (preset: Preset) => void
}

export function PresetButtons({ presets, activePreset, modelType, onSelectPreset }: PresetButtonsProps) {
  // Filter presets: hide "Turbo" presets when non-turbo model is loaded
  const filteredPresets = modelType && modelType !== 'turbo'
    ? presets.filter((p) => !p.name.toLowerCase().startsWith('turbo') && !p.name.startsWith('⚡'))
    : presets

  if (filteredPresets.length === 0) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Load Example Preset:</label>
        <p className="text-xs text-muted-foreground">No presets available for this model.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Load Example Preset:</label>
      <div className="flex flex-wrap gap-2">
        {filteredPresets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onSelectPreset(preset)}
            title={`Load '${preset.name}' preset`}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              activePreset === preset.name
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-foreground hover:bg-accent',
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  )
}
