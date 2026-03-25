import { useRef } from 'react'
import { Upload, RefreshCw } from 'lucide-react'

interface CloneVoicesProps {
  referenceFiles: string[]
  selectedFile: string | null
  onFileChange: (filename: string | null) => void
  onUpload: (files: FileList) => void
  onRefresh: () => void
}

export function CloneVoices({
  referenceFiles,
  selectedFile,
  onFileChange,
  onUpload,
  onRefresh,
}: CloneVoicesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1">
      <label htmlFor="clone-reference-select" className="text-sm font-medium text-foreground">
        Reference Audio File
      </label>
      <p className="text-xs text-muted-foreground">
        Select an uploaded <code className="rounded bg-muted px-1 py-0.5 text-xs">.wav</code> or{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">.mp3</code> file.
        For best results, use clean audio recordings.
      </p>
      <div className="flex items-center gap-2">
        <select
          id="clone-reference-select"
          value={selectedFile ?? 'none'}
          onChange={(e) => onFileChange(e.target.value === 'none' ? null : e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="none">-- Select Reference File --</option>
          {referenceFiles.map((f) => (
            <option key={f} value={f}>{f}</option>
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
          title="Import new reference files"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh reference file list"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </div>
  )
}
