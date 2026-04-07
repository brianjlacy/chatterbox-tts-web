/**
 * Audio encoding and decoding utilities.
 * Supports WAV and MP3 output formats.
 * WAV is implemented manually (no library). MP3 uses lamejs.
 * Opus support is a future enhancement.
 */

// lamejs is a CommonJS module
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const lamejs = require('lamejs') as { Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => LameEncoder }

interface LameEncoder {
  encodeBuffer(left: Int16Array): Int8Array
  flush(): Int8Array
}

// --- WAV decode ---

/**
 * Decode a standard PCM int16 WAV buffer into a Float32Array.
 * Handles the 44-byte RIFF header manually — no library needed.
 */
export function decodeWav(buffer: Buffer): { audio: Float32Array; sampleRate: number } {
  // Validate RIFF header
  const riff = buffer.toString('ascii', 0, 4)
  const wave = buffer.toString('ascii', 8, 12)
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Invalid WAV file: missing RIFF/WAVE header')
  }

  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)

  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample} (expected 16)`)
  }

  // Find the 'data' chunk — may not be exactly at offset 36 if there are extra chunks
  let dataOffset = 12
  while (dataOffset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', dataOffset, dataOffset + 4)
    const chunkSize = buffer.readUInt32LE(dataOffset + 4)
    if (chunkId === 'data') {
      dataOffset += 8
      const numSamples = chunkSize / 2
      const audio = new Float32Array(numSamples)
      for (let i = 0; i < numSamples; i++) {
        const sample = buffer.readInt16LE(dataOffset + i * 2)
        audio[i] = sample / 32767
      }
      return { audio, sampleRate }
    }
    dataOffset += 8 + chunkSize
  }

  throw new Error('Invalid WAV file: no data chunk found')
}

// --- WAV encode ---

/**
 * Encode a Float32Array as a standard PCM int16 WAV buffer.
 * Written manually — no library needed.
 */
function encodeWav(audio: Float32Array, sampleRate: number): Buffer {
  const numSamples = audio.length
  const dataBytes = numSamples * 2            // int16 = 2 bytes per sample
  const totalBytes = 44 + dataBytes

  const buf = Buffer.allocUnsafe(totalBytes)

  // RIFF chunk descriptor
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + dataBytes, 4)        // file size - 8
  buf.write('WAVE', 8, 'ascii')

  // fmt sub-chunk
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)                   // sub-chunk size (PCM)
  buf.writeUInt16LE(1, 20)                    // audio format: PCM
  buf.writeUInt16LE(1, 22)                    // channels: mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)       // byte rate = sampleRate * channels * bitsPerSample/8
  buf.writeUInt16LE(2, 32)                    // block align = channels * bitsPerSample/8
  buf.writeUInt16LE(16, 34)                   // bits per sample

  // data sub-chunk
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(dataBytes, 40)

  // PCM samples
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, audio[i]))
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  return buf
}

// --- MP3 encode ---

const MP3_CHUNK_SIZE = 1152   // lamejs processes in 1152-sample frames

/**
 * Encode a Float32Array as MP3 using lamejs (pure JS LAME port).
 */
function encodeMp3(audio: Float32Array, sampleRate: number): Buffer {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
  const int16 = new Int16Array(audio.length)
  for (let i = 0; i < audio.length; i++) {
    int16[i] = Math.round(Math.max(-1, Math.min(1, audio[i])) * 32767)
  }

  const chunks: Int8Array[] = []
  for (let offset = 0; offset < int16.length; offset += MP3_CHUNK_SIZE) {
    const slice = int16.subarray(offset, offset + MP3_CHUNK_SIZE)
    const encoded = encoder.encodeBuffer(slice)
    if (encoded.length > 0) chunks.push(encoded)
  }
  const flushed = encoder.flush()
  if (flushed.length > 0) chunks.push(flushed)

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = Buffer.allocUnsafe(totalLength)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

// --- Main export ---

/**
 * Encode a Float32Array audio buffer to the requested format.
 * Supported: 'wav', 'mp3'.
 */
export function encodeAudio(
  audio: Float32Array,
  sampleRate: number,
  format: 'wav' | 'mp3',
): Buffer {
  if (format === 'mp3') return encodeMp3(audio, sampleRate)
  return encodeWav(audio, sampleRate)
}
