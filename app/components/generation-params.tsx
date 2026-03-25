import { PARAM_RANGES } from '~/lib/constants'
import type { ModelType } from '~/lib/types'

interface GenerationParamsProps {
  temperature: number
  exaggeration: number
  cfgWeight: number
  speedFactor: number
  seed: number
  modelType: ModelType | null
  onTemperatureChange: (v: number) => void
  onExaggerationChange: (v: number) => void
  onCfgWeightChange: (v: number) => void
  onSpeedFactorChange: (v: number) => void
  onSeedChange: (v: number) => void
}

function ParamSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  hidden,
  warning,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  hidden?: boolean
  warning?: string
}) {
  if (hidden) return null

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} (<span className="tabular-nums">{value}</span>)
        {warning && <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">{warning}</span>}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

export function GenerationParams({
  temperature,
  exaggeration,
  cfgWeight,
  speedFactor,
  seed,
  modelType,
  onTemperatureChange,
  onExaggerationChange,
  onCfgWeightChange,
  onSpeedFactorChange,
  onSeedChange,
}: GenerationParamsProps) {
  const isTurbo = modelType === 'turbo'
  const speedWarning = speedFactor !== 1.0 ? '* Experimental, may cause echo.' : undefined

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ParamSlider
        id="temperature"
        label="Temperature"
        value={temperature}
        {...PARAM_RANGES.temperature}
        onChange={onTemperatureChange}
      />
      <ParamSlider
        id="exaggeration"
        label="Exaggeration"
        value={exaggeration}
        {...PARAM_RANGES.exaggeration}
        onChange={onExaggerationChange}
        hidden={isTurbo}
      />
      <ParamSlider
        id="cfg-weight"
        label="CFG Weight"
        value={cfgWeight}
        {...PARAM_RANGES.cfgWeight}
        onChange={onCfgWeightChange}
        hidden={isTurbo}
      />
      <ParamSlider
        id="speed-factor"
        label="Speed Factor"
        value={speedFactor}
        {...PARAM_RANGES.speedFactor}
        onChange={onSpeedFactorChange}
        warning={speedWarning}
      />
      <div className="space-y-1">
        <label htmlFor="seed" className="text-sm font-medium text-foreground">Generation Seed</label>
        <input
          id="seed"
          type="number"
          value={seed}
          onChange={(e) => onSeedChange(parseInt(e.target.value, 10) || 0)}
          placeholder="0 (or -1 for random)"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          title="Enter an integer seed for reproducible results, or -1 for random."
        />
        <p className="text-xs text-muted-foreground">Integer for reproducible results. Some engines use 0 or -1 for random.</p>
      </div>
    </div>
  )
}
