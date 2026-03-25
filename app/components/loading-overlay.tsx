import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  status?: string
  onCancel: () => void
}

export function LoadingOverlay({
  visible,
  message = 'Generating audio...',
  status = 'Please wait. This may take some time.',
  onCancel,
}: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center text-card-foreground shadow-xl">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">{message}</p>
        <p className="mt-1 text-sm text-muted-foreground">{status}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
