interface ChunkWarningModalProps {
  open: boolean
  onCancel: () => void
  onProceed: (dontShowAgain: boolean) => void
}

export function ChunkWarningModal({ open, onCancel, onProceed }: ChunkWarningModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl">
        <h3 className="text-lg font-semibold">Chunking Voice Consistency Warning</h3>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>
            You are generating with text splitting enabled and not using Predefined Voices or
            Voice Cloning with a fixed seed.
          </p>
          <p>
            This combination may result in <strong className="text-foreground">different voices for different text chunks</strong>,
            leading to inconsistent audio.
          </p>
          <p>For consistent voices across chunks, please use:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>&quot;Predefined Voices&quot; mode.</li>
            <li>&quot;Voice Cloning&quot; mode.</li>
            <li>A specific integer in &quot;Generation Seed&quot; (not random).</li>
          </ul>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" id="hide-chunk-warning" className="h-4 w-4 rounded border-input" />
            <span className="text-muted-foreground">Do not show this warning again</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel Generation
          </button>
          <button
            type="button"
            onClick={() => {
              const checkbox = document.getElementById('hide-chunk-warning') as HTMLInputElement
              onProceed(checkbox?.checked ?? false)
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
