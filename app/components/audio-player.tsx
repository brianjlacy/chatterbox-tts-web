import { useRef, useEffect } from 'react'
import { Play, Pause, Download } from 'lucide-react'
import { useWaveSurfer } from '~/hooks/use-wavesurfer'
import { formatTime } from '~/lib/utils'
import type { AudioResult } from '~/lib/types'

interface AudioPlayerProps {
  result: AudioResult
}

export function AudioPlayer({ result }: AudioPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const { loadAudio, togglePlayPause, isPlaying, isReady, duration } = useWaveSurfer({
    containerRef: waveformRef,
  })

  useEffect(() => {
    if (result.audioUrl) {
      loadAudio(result.audioUrl)
    }
  }, [result.audioUrl, loadAudio])

  const fileExtension = result.filename.split('.').pop()?.toUpperCase() ?? 'WAV'

  return (
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Generated Audio</h2>

      {/* Waveform */}
      <div ref={waveformRef} className="mb-4 min-h-[80px]" />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!isReady}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPlaying ? (
              <><Pause className="h-4 w-4" /> Pause</>
            ) : (
              <><Play className="h-4 w-4" /> Play</>
            )}
          </button>

          <a
            href={result.audioUrl}
            download={result.filename}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Download {fileExtension}
          </a>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            Mode: <span className="font-medium text-foreground">{result.voiceMode}</span>
            {result.predefinedVoice && ` (${result.predefinedVoice})`}
            {result.cloneFile && ` (${result.cloneFile})`}
          </span>
          <span className="text-border">•</span>
          <span>
            Gen Time: <span className="tabular-nums font-medium text-foreground">{result.genTime}s</span>
          </span>
          <span className="text-border">•</span>
          <span>
            Duration: <span className="tabular-nums font-medium text-foreground">{formatTime(duration)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
