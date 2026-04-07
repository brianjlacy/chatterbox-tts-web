/**
 * Audio stitching and post-processing utilities.
 *
 * Handles crossfading, edge fades, DC offset removal, and peak normalization
 * for concatenating multiple TTS audio chunks into a seamless output.
 */

import { createRequire } from 'node:module'
const _require = createRequire(import.meta.url)

interface SoundTouchInstance {
  tempo: number
  inputBuffer: { putSamples(s: Float32Array, pos: number, frames: number): void }
  outputBuffer: { frameCount: number; startIndex: number; vector: Float32Array }
  process(): void
}

let SoundTouch: new (sampleRate: number) => SoundTouchInstance
try {
  ;({ SoundTouch } = _require('soundtouch-ts') as { SoundTouch: new (sampleRate: number) => SoundTouchInstance })
} catch {
  SoundTouch = null as unknown as new (sampleRate: number) => SoundTouchInstance
}

// Stitching constants
const SENTENCE_PAUSE_MS = 200
const CROSSFADE_MS = 20
const SAFETY_FADE_MS = 3
const PEAK_NORMALIZE_THRESHOLD = 0.99
const PEAK_NORMALIZE_TARGET = 0.95

/** Generate equal-power crossfade curves (cos²/sin²) */
function generateEqualPowerCurves(nSamples: number): { fadeOut: Float32Array; fadeIn: Float32Array } {
  const fadeOut = new Float32Array(nSamples)
  const fadeIn = new Float32Array(nSamples)

  for (let i = 0; i < nSamples; i++) {
    const t = (i / (nSamples - 1)) * (Math.PI / 2)
    fadeOut[i] = Math.cos(t) ** 2
    fadeIn[i] = Math.sin(t) ** 2
  }

  return { fadeOut, fadeIn }
}

/** Crossfade two audio chunks with overlap */
function crossfadeWithOverlap(
  chunkA: Float32Array,
  chunkB: Float32Array,
  fadeSamples: number,
): Float32Array {
  const actualFade = Math.min(fadeSamples, chunkA.length, chunkB.length)

  if (actualFade <= 0) {
    const result = new Float32Array(chunkA.length + chunkB.length)
    result.set(chunkA)
    result.set(chunkB, chunkA.length)
    return result
  }

  const { fadeOut, fadeIn } = generateEqualPowerCurves(actualFade)
  const resultLength = chunkA.length + chunkB.length - actualFade
  const result = new Float32Array(resultLength)

  // Copy chunk A before the fade region
  result.set(chunkA.subarray(0, chunkA.length - actualFade))

  // Crossfade region
  const offset = chunkA.length - actualFade
  for (let i = 0; i < actualFade; i++) {
    result[offset + i] = chunkA[chunkA.length - actualFade + i] * fadeOut[i]
      + chunkB[i] * fadeIn[i]
  }

  // Copy chunk B after the fade region
  result.set(chunkB.subarray(actualFade), chunkA.length)

  return result
}

/** Apply minimal linear edge fades for click protection */
function applyEdgeFades(
  chunk: Float32Array,
  fadeSamples: number,
  fadeIn: boolean,
  fadeOut: boolean,
): Float32Array {
  if (chunk.length < fadeSamples * 2) return chunk

  const result = new Float32Array(chunk)

  if (fadeIn) {
    for (let i = 0; i < fadeSamples; i++) {
      result[i] *= i / fadeSamples
    }
  }

  if (fadeOut) {
    for (let i = 0; i < fadeSamples; i++) {
      result[chunk.length - fadeSamples + i] *= 1 - i / fadeSamples
    }
  }

  return result
}

/** Stitch multiple audio segments together with crossfading */
export function stitchAudioSegments(
  segments: Float32Array[],
  sampleRate: number,
  enableSmartStitching = true,
): Float32Array {
  if (segments.length === 0) return new Float32Array(0)
  if (segments.length === 1) return segments[0]

  if (!sampleRate || sampleRate <= 0) {
    // Fallback: raw concatenation
    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0)
    const result = new Float32Array(totalLength)
    let offset = 0
    for (const seg of segments) {
      result.set(seg, offset)
      offset += seg.length
    }
    return result
  }

  if (enableSmartStitching) {
    const fadeSamples = Math.floor((CROSSFADE_MS / 1000) * sampleRate)
    const desiredSilenceSamples = Math.floor((SENTENCE_PAUSE_MS / 1000) * sampleRate)
    const silenceBufferSamples = desiredSilenceSamples + fadeSamples * 2

    let result = new Float32Array(segments[0])

    for (let i = 1; i < segments.length; i++) {
      const silence = new Float32Array(silenceBufferSamples)
      result = crossfadeWithOverlap(result, silence, fadeSamples)
      result = crossfadeWithOverlap(result, new Float32Array(segments[i]), fadeSamples)
    }

    return result
  }

  // Fallback: safety edge fades
  const fadeSamples = Math.floor((SAFETY_FADE_MS / 1000) * sampleRate)
  const processedChunks = segments.map((chunk, i) =>
    applyEdgeFades(
      new Float32Array(chunk),
      fadeSamples,
      i !== 0,           // No fade-in on first chunk
      i !== segments.length - 1, // No fade-out on last chunk
    ),
  )

  const totalLength = processedChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of processedChunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

// --- Speed factor ---

/**
 * Time-stretch audio to adjust playback speed without changing pitch.
 * Uses soundtouch-ts (SoundTouch DSP library — equivalent to librosa.effects.time_stretch).
 * Returns original audio if speedFactor is 1.0 or if processing fails.
 */
export function applySpeedFactor(
  audio: Float32Array,
  sampleRate: number,
  speedFactor: number,
): Float32Array {
  if (speedFactor === 1.0) return audio
  if (speedFactor <= 0) {
    console.warn(`[AudioProcessing] Invalid speedFactor ${speedFactor}, returning original`)
    return audio
  }

  try {
    if (!SoundTouch) throw new Error('soundtouch-ts not available')
    const st = new SoundTouch(sampleRate)
    // tempo > 1 = faster, < 1 = slower; pitch is preserved
    st.tempo = speedFactor

    // soundtouch-ts is hardwired to stereo interleaved (2 samples per frame).
    // Duplicate mono channel to L+R before feeding in.
    const stereoIn = new Float32Array(audio.length * 2)
    for (let i = 0; i < audio.length; i++) {
      stereoIn[i * 2] = audio[i]
      stereoIn[i * 2 + 1] = audio[i]
    }
    st.inputBuffer.putSamples(stereoIn, 0, audio.length)  // numFrames = mono sample count
    st.process()

    const outFrames = st.outputBuffer.frameCount
    if (outFrames <= 0) return audio
    // startIndex is already a sample offset (position * 2 internally)
    const outStart = st.outputBuffer.startIndex
    const stereoOut = st.outputBuffer.vector.slice(outStart, outStart + outFrames * 2)
    // Extract left channel (every other sample) → mono
    const monoOut = new Float32Array(outFrames)
    for (let i = 0; i < outFrames; i++) {
      monoOut[i] = stereoOut[i * 2]
    }
    return monoOut
  } catch (err) {
    console.warn('[AudioProcessing] Speed factor failed, returning original audio:', err)
    return audio
  }
}

// --- Silence post-processing ---

const FRAME_LENGTH = 2048
const HOP_LENGTH = 512

/** Compute per-frame RMS energy over the audio signal. */
function computeFrameRms(audio: Float32Array): Float32Array {
  const numFrames = Math.max(1, Math.floor((audio.length - FRAME_LENGTH) / HOP_LENGTH) + 1)
  const rms = new Float32Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    const start = i * HOP_LENGTH
    let sum = 0
    const end = Math.min(start + FRAME_LENGTH, audio.length)
    for (let j = start; j < end; j++) {
      sum += audio[j] ** 2
    }
    rms[i] = Math.sqrt(sum / FRAME_LENGTH)
  }
  return rms
}

/** Convert frame index to the center sample index. */
function frameToSample(frameIdx: number): number {
  return frameIdx * HOP_LENGTH + Math.floor(FRAME_LENGTH / 2)
}

/**
 * Trim leading and trailing silence from audio.
 * Equivalent to Python's librosa.effects.trim().
 */
export function trimLeadTrailSilence(
  audio: Float32Array,
  sampleRate: number,
  thresholdDb = -40,
  paddingMs = 50,
): Float32Array {
  if (audio.length === 0) return audio

  const threshold = 10 ** (thresholdDb / 20)
  const rms = computeFrameRms(audio)

  let firstActive = -1
  let lastActive = -1
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] >= threshold) {
      if (firstActive === -1) firstActive = i
      lastActive = i
    }
  }

  if (firstActive === -1) return audio  // entirely silent — return as-is

  const paddingSamples = Math.round((paddingMs / 1000) * sampleRate)
  const start = Math.max(0, frameToSample(firstActive) - paddingSamples)
  const end = Math.min(audio.length, frameToSample(lastActive) + FRAME_LENGTH + paddingSamples)

  if (start === 0 && end === audio.length) return audio
  return audio.slice(start, end)
}

/**
 * Shorten internal silences that exceed minSilenceMs down to maxAllowedMs.
 * Equivalent to Python's fix_internal_silence() using librosa.effects.split().
 */
export function fixInternalSilence(
  audio: Float32Array,
  sampleRate: number,
  minSilenceMs = 700,
  maxAllowedMs = 300,
): Float32Array {
  if (audio.length === 0) return audio

  const threshold = 10 ** (-40 / 20)
  const rms = computeFrameRms(audio)
  const minSilenceSamples = Math.round((minSilenceMs / 1000) * sampleRate)
  const maxSilenceSamples = Math.round((maxAllowedMs / 1000) * sampleRate)

  // Find non-silent intervals as [startSample, endSample] pairs
  const intervals: Array<[number, number]> = []
  let inVoiced = false
  let segStart = 0
  for (let i = 0; i < rms.length; i++) {
    const sample = frameToSample(i)
    if (rms[i] >= threshold && !inVoiced) {
      segStart = sample
      inVoiced = true
    } else if (rms[i] < threshold && inVoiced) {
      intervals.push([segStart, Math.min(sample, audio.length)])
      inVoiced = false
    }
  }
  if (inVoiced) intervals.push([segStart, audio.length])

  if (intervals.length <= 1) return audio

  const parts: Float32Array[] = []
  let lastEnd = 0

  for (const [start, end] of intervals) {
    const silenceDuration = start - lastEnd
    if (silenceDuration > 0) {
      if (silenceDuration >= minSilenceSamples) {
        parts.push(audio.slice(lastEnd, lastEnd + maxSilenceSamples))
      } else {
        parts.push(audio.slice(lastEnd, start))
      }
    }
    parts.push(audio.slice(start, end))
    lastEnd = end
  }

  // Handle trailing audio after the last non-silent segment
  if (lastEnd < audio.length) {
    const trailDuration = audio.length - lastEnd
    if (trailDuration >= minSilenceSamples) {
      parts.push(audio.slice(lastEnd, lastEnd + maxSilenceSamples))
    } else {
      parts.push(audio.slice(lastEnd))
    }
  }

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
  const result = new Float32Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

/** Normalize audio to prevent clipping */
export function normalizeAudio(audio: Float32Array): Float32Array {
  let peak = 0
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i])
    if (abs > peak) peak = abs
  }

  if (peak > PEAK_NORMALIZE_THRESHOLD) {
    const scale = PEAK_NORMALIZE_TARGET / peak
    const result = new Float32Array(audio.length)
    for (let i = 0; i < audio.length; i++) {
      result[i] = audio[i] * scale
    }
    return result
  }

  return audio
}
