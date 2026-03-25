import { PARAM_RANGES } from '~/lib/constants'

interface ChunkControlsProps {
  splitText: boolean
  chunkSize: number
  onSplitTextChange: (checked: boolean) => void
  onChunkSizeChange: (value: number) => void
}

export function ChunkControls({
  splitText,
  chunkSize,
  onSplitTextChange,
  onChunkSizeChange,
}: ChunkControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splitText}
            onChange={(e) => onSplitTextChange(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-foreground">Split text into chunks</span>
        </label>

        {splitText && (
          <div className="flex items-center gap-2">
            <label htmlFor="chunk-size-slider" className="text-sm text-muted-foreground">
              Chunk Size:
            </label>
            <input
              id="chunk-size-slider"
              type="range"
              min={PARAM_RANGES.chunkSize.min}
              max={PARAM_RANGES.chunkSize.max}
              step={PARAM_RANGES.chunkSize.step}
              value={chunkSize}
              onChange={(e) => onChunkSizeChange(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-sm tabular-nums text-foreground">{chunkSize}</span>
          </div>
        )}
      </div>

      {splitText && (
        <p className="text-xs text-muted-foreground">
          Splitting is essential for longer texts like articles or audiobook chapters.
          Recommended chunk size: ~150–400 characters.
        </p>
      )}
    </div>
  )
}
