export function TipsSection() {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">Tips & Tricks</h2>
      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            For <strong className="text-foreground">Audiobooks</strong>, use{' '}
            <strong className="text-foreground">MP3</strong> format, enable{' '}
            <strong className="text-foreground">Split text</strong>, and set a chunk size of ~250–500.
          </li>
          <li>
            Use <strong className="text-foreground">Predefined Voices</strong> for consistent, high-quality output. You can import new ones.
          </li>
          <li>
            For <strong className="text-foreground">Voice Cloning</strong>, upload clean reference audio
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">.wav</code>/<code className="rounded bg-muted px-1 py-0.5 text-xs">.mp3</code>).
            Quality of reference is key.
          </li>
          <li>
            Experiment with <strong className="text-foreground">Temperature</strong> and other generation parameters to fine-tune output.
          </li>
          <li>
            Adjusting <strong className="text-foreground">Speed Factor</strong> away from 1.0 is experimental and may cause echo.
          </li>
          <li>
            When using <strong className="text-foreground">Turbo</strong> model, you can insert paralinguistic tags like{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">[laugh]</code> or{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">[sigh]</code> for natural vocal reactions.
          </li>
        </ul>
      </div>
    </div>
  )
}
