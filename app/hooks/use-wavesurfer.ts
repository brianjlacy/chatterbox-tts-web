import { useRef, useEffect, useCallback, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTheme } from '~/hooks/use-theme'

interface WaveSurferOptions {
  containerRef: React.RefObject<HTMLElement | null>
}

function getColors(isDark: boolean) {
  return {
    waveColor: isDark ? '#6366f1' : '#a5b4fc',
    progressColor: isDark ? '#4f46e5' : '#6366f1',
    cursorColor: isDark ? '#cbd5e1' : '#475569',
  }
}

export function useWaveSurfer({ containerRef }: WaveSurferOptions) {
  const wsRef = useRef<WaveSurfer | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const { theme } = useTheme()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [duration, setDuration] = useState(0)

  // Update colors when theme changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.setOptions(getColors(theme === 'dark'))
    }
  }, [theme])

  const loadAudio = useCallback((audioUrl: string) => {
    // Destroy previous instance
    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }

    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!containerRef.current) return

    setIsReady(false)
    setIsPlaying(false)
    setDuration(0)

    const isDark = document.documentElement.classList.contains('dark')
    const colors = getColors(isDark)

    const ws = WaveSurfer.create({
      container: containerRef.current,
      ...colors,
      barWidth: 3,
      barRadius: 3,
      cursorWidth: 1,
      height: 80,
      barGap: 2,
      normalize: true,
      url: audioUrl,
    })

    ws.on('ready', () => {
      setIsReady(true)
      setDuration(ws.getDuration())
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => {
      setIsPlaying(false)
      ws.seekTo(0)
    })

    ws.on('error', (err) => {
      console.error('[WaveSurfer] Error:', err)
    })

    wsRef.current = ws
    blobUrlRef.current = audioUrl
  }, [containerRef])

  const togglePlayPause = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.playPause()
    }
  }, [])

  const destroy = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setIsReady(false)
    setIsPlaying(false)
    setDuration(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy()
    }
  }, [destroy])

  return {
    loadAudio,
    togglePlayPause,
    destroy,
    isPlaying,
    isReady,
    duration,
  }
}
