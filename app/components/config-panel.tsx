import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AppConfig } from '~/lib/types'

interface ConfigPanelProps {
  config: AppConfig
  onSaveConfig: (partial: Record<string, unknown>) => Promise<void>
  onResetSettings: () => Promise<void>
  onRestartServer: () => Promise<void>
}

function ConfigField({
  label,
  name,
  value,
  readOnly = false,
  type = 'text',
  onChange,
}: {
  label: string
  name: string
  value: string | number
  readOnly?: boolean
  type?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground read-only:opacity-60"
      />
    </div>
  )
}

export function ConfigPanel({ config, onSaveConfig, onResetSettings: _onResetSettings, onRestartServer }: ConfigPanelProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [showRestart, setShowRestart] = useState(false)

  async function handleSaveConfig() {
    setStatus('Saving...')
    try {
      const editableFields: Record<string, unknown> = {
        audio_output: {
          format: config.audio_output?.format,
          sample_rate: config.audio_output?.sample_rate,
        },
      }
      await onSaveConfig(editableFields)
      setStatus('Configuration saved.')
      setShowRestart(true)
      setTimeout(() => setStatus(null), 5000)
    } catch (err) {
      setStatus(`Error: ${err}`)
    }
  }

  async function handleRestart() {
    if (!confirm('Are you sure you want to restart the server?')) return
    setStatus('Restarting...')
    try {
      await onRestartServer()
      setStatus('Server restart initiated.')
    } catch (err) {
      setStatus(`Restart error: ${err}`)
    }
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center justify-between rounded-md py-2 text-sm font-medium text-foreground hover:text-foreground/80">
        <span>Server Configuration</span>
        <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          These settings are loaded from <code className="rounded bg-muted px-1 py-0.5 text-xs">config.yaml</code>.
          <strong> Restart the server</strong> to apply changes to Host, Port, Model, or Path settings.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField label="Server Host" name="server.host" value={config.server?.host ?? ''} readOnly />
          <ConfigField label="Server Port" name="server.port" value={config.server?.port ?? 8004} type="number" readOnly />
          <ConfigField label="TTS Device" name="tts_engine.device" value={config.tts_engine?.device ?? ''} readOnly />
          <ConfigField label="Default Voice ID" name="tts_engine.default_voice_id" value={config.tts_engine?.default_voice_id ?? ''} readOnly />
          <ConfigField label="Model Cache Path" name="paths.model_cache" value={config.paths?.model_cache ?? ''} readOnly />
          <ConfigField label="Predefined Voices Path" name="tts_engine.predefined_voices_path" value={config.tts_engine?.predefined_voices_path ?? ''} readOnly />
          <ConfigField label="Reference Audio Path" name="tts_engine.reference_audio_path" value={config.tts_engine?.reference_audio_path ?? ''} readOnly />
          <ConfigField label="Output Path" name="paths.output" value={config.paths?.output ?? ''} readOnly />
          <ConfigField label="Audio Output Format" name="audio_output.format" value={config.audio_output?.format ?? 'wav'} readOnly />
          <ConfigField label="Audio Sample Rate" name="audio_output.sample_rate" value={config.audio_output?.sample_rate ?? 24000} type="number" readOnly />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Save Server Configuration
          </button>
          {showRestart && (
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <RefreshCw className="h-3 w-3" />
              Restart Server
            </button>
          )}
          {status && <span className="text-xs text-muted-foreground">{status}</span>}
        </div>
      </div>
    </details>
  )
}

export function ResetSettingsButton({ onReset }: { onReset: () => Promise<void> }) {
  async function handleReset() {
    if (!confirm('Are you sure you want to reset ALL settings to defaults? This cannot be undone.')) return
    await onReset()
  }

  return (
    <div className="border-t border-border px-6 py-4">
      <button
        type="button"
        onClick={handleReset}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
      >
        Reset All Settings
      </button>
      <span className="ml-2 text-xs text-muted-foreground">Resets settings to their defaults.</span>
    </div>
  )
}
