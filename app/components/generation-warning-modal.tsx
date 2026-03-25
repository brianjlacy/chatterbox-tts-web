interface GenerationWarningModalProps {
  open: boolean
  onAcknowledge: (dontShowAgain: boolean) => void
}

export function GenerationWarningModal({ open, onAcknowledge }: GenerationWarningModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl">
        <h3 className="text-lg font-semibold">Generation Quality Notice</h3>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>
            Please be aware that text-to-speech models may sometimes produce unexpected results or artifacts.
          </p>
          <p>
            This can include variations in voice consistency, delivery, or minor audio imperfections.
            Experiment with parameters for best results.
          </p>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" id="hide-gen-warning" className="h-4 w-4 rounded border-input" />
            <span className="text-muted-foreground">Do not show this warning again</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const checkbox = document.getElementById('hide-gen-warning') as HTMLInputElement
              onAcknowledge(checkbox?.checked ?? false)
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Acknowledge & Generate
          </button>
        </div>
      </div>
    </div>
  )
}
