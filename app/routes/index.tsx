import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold">Generate Speech</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          TTS form components will be built in Phase 5.
        </p>
      </div>
    </div>
  )
}
