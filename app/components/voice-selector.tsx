import type { VoiceMode } from '~/lib/types'
import { cn } from '~/lib/utils'

interface VoiceSelectorProps {
  voiceMode: VoiceMode
  onVoiceModeChange: (mode: VoiceMode) => void
  children: React.ReactNode
}

export function VoiceSelector({ voiceMode, onVoiceModeChange, children }: VoiceSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Voice Mode:</label>
      <div className="flex gap-1 rounded-lg border border-input bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => onVoiceModeChange('predefined')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            voiceMode === 'predefined'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Predefined Voices
        </button>
        <button
          type="button"
          onClick={() => onVoiceModeChange('clone')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            voiceMode === 'clone'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Voice Cloning (Reference)
        </button>
      </div>
      {children}
    </div>
  )
}
