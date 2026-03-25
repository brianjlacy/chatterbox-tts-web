/**
 * Audio stitching and post-processing utilities.
 *
 * Handles crossfading, edge fades, DC offset removal, and peak normalization
 * for concatenating multiple TTS audio chunks into a seamless output.
 */

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
