import { OUTPUT_FORMATS } from '~/lib/constants'
import type { OutputFormat as OutputFormatType } from '~/lib/types'

interface OutputFormatProps {
  format: OutputFormatType
  onChange: (format: OutputFormatType) => void
}

export function OutputFormat({ format, onChange }: OutputFormatProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="output-format" className="text-sm font-medium text-foreground">Output Format</label>
      <select
        id="output-format"
        value={format}
        onChange={(e) => onChange(e.target.value as OutputFormatType)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
      >
        {OUTPUT_FORMATS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">MP3 is recommended for smaller file sizes (e.g., audiobooks).</p>
    </div>
  )
}
