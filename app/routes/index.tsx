import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Chatterbox TTS Server</h1>
      <p className="mt-2 text-muted-foreground">
        TanStack Start application — scaffolding complete.
      </p>
    </div>
  )
}
