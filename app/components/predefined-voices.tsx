import { useRef } from 'react'
import { Upload, RefreshCw } from 'lucide-react'
import type { Voice } from '~/lib/types'

interface PredefinedVoicesProps {
  voices: Voice[]
  selectedVoice: string | null
  onVoiceChange: (voiceId: string | null) => void
  onUpload: (files: FileList) => void
  onRefresh: () => void
}

export function PredefinedVoices({
  voices,
  selectedVoice,
  onVoiceChange,
  onUpload,
  onRefresh,
}: PredefinedVoicesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1">
      <label htmlFor="predefined-voice-select" className="text-sm font-medium text-foreground">
        Select Predefined Voice:
      </label>
      <div className="flex items-center gap-2">
        <select
          id="predefined-voice-select"
          value={selectedVoice ?? 'none'}
          onChange={(e) => onVoiceChange(e.target.value === 'none' ? null : e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="none">-- Select Voice --</option>
          {voices.map((v) => (
            <option key={v.filename} value={v.filename}>{v.display_name}</option>
          ))}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".wav,.mp3"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Import new predefined voice files"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh predefined voice list"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </div>
  )
}
