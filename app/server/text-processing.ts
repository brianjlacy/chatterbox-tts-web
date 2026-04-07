/**
 * Text chunking utilities for TTS preprocessing.
 * Ported from python-server/utils.py — mirrors the Python implementation exactly.
 */

// --- Abbreviations ---
const ABBREVIATIONS: Set<string> = new Set([
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'rev.', 'hon.', 'st.',
  'etc.', 'e.g.', 'i.e.', 'vs.',
  'approx.', 'apt.', 'dept.', 'fig.', 'gen.', 'gov.', 'inc.',
  'jr.', 'sr.', 'ltd.', 'no.', 'p.', 'pp.', 'vol.', 'op.', 'cit.',
  'ca.', 'cf.', 'ed.', 'esp.', 'et.', 'al.', 'ibid.', 'id.',
  'inf.', 'sup.', 'viz.', 'sc.', 'fl.', 'd.', 'b.', 'r.', 'c.', 'v.',
  'u.s.', 'u.k.', 'a.m.', 'p.m.', 'a.d.', 'b.c.',
])

// Pre-compiled regex patterns
const NUMBER_DOT_NUMBER_PATTERN = /(?<!\d\.)\d*\.\d+/g
const VERSION_PATTERN = /[vV]?\d+(\.\d+)+/g
const POTENTIAL_END_PATTERN = /([.!?])(["']?)(\s+|$)/g
const BULLET_POINT_PATTERN = /(?:^|\n)\s*([-•*]|\d+\.)\s+/g
const NON_VERBAL_CUE_PATTERN = /(\([\w\s'-]+\))/g

// --- Sentence-end validation ---
function isValidSentenceEnd(text: string, periodIndex: number): boolean {
  // Walk back to find the word before the period
  let wordStart = periodIndex - 1
  const scanLimit = Math.max(0, periodIndex - 10)
  while (wordStart >= scanLimit && !/\s/.test(text[wordStart])) {
    wordStart--
  }
  const wordBefore = text.slice(wordStart + 1, periodIndex + 1).toLowerCase()
  if (ABBREVIATIONS.has(wordBefore)) return false

  // Check for numeric/version context around the period
  const contextStart = Math.max(0, periodIndex - 10)
  const contextEnd = Math.min(text.length, periodIndex + 10)
  const context = text.slice(contextStart, contextEnd)
  const relIdx = periodIndex - contextStart

  for (const pattern of [NUMBER_DOT_NUMBER_PATTERN, VERSION_PATTERN]) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(context)) !== null) {
      if (match.index <= relIdx && relIdx < match.index + match[0].length) {
        const isLastChar = relIdx === match.index + match[0].length - 1
        const followedBySpaceOrEnd = periodIndex + 1 === text.length || /\s/.test(text[periodIndex + 1])
        if (!(isLastChar && followedBySpaceOrEnd)) return false
      }
    }
  }

  return true
}

// --- Punctuation-based sentence splitting ---
function splitTextByPunctuation(text: string): string[] {
  const sentences: string[] = []
  let lastSplitIndex = 0
  const textLength = text.length

  POTENTIAL_END_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = POTENTIAL_END_PATTERN.exec(text)) !== null) {
    const punctIndex = match.index
    const punctChar = text[punctIndex]
    const sliceEnd = match.index + 1 + (match[2]?.length ?? 0)

    if (punctChar === '!' || punctChar === '?') {
      const sentence = text.slice(lastSplitIndex, sliceEnd).trim()
      if (sentence) sentences.push(sentence)
      lastSplitIndex = match.index + match[0].length
      continue
    }

    if (punctChar === '.') {
      // Skip ellipsis
      if (
        (punctIndex > 0 && text[punctIndex - 1] === '.') ||
        (punctIndex < textLength - 1 && text[punctIndex + 1] === '.')
      ) {
        continue
      }

      if (isValidSentenceEnd(text, punctIndex)) {
        const sentence = text.slice(lastSplitIndex, sliceEnd).trim()
        if (sentence) sentences.push(sentence)
        lastSplitIndex = match.index + match[0].length
      }
    }
  }

  const remaining = text.slice(lastSplitIndex).trim()
  if (remaining) sentences.push(remaining)

  const filtered = sentences.filter(Boolean)
  if (filtered.length === 0 && text.trim()) return [text.trim()]
  return filtered
}

// --- Sentence splitting with bullet-point awareness ---
function splitIntoSentences(text: string): string[] {
  if (!text || /^\s*$/.test(text)) return []

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  BULLET_POINT_PATTERN.lastIndex = 0
  const bulletMatches = [...normalized.matchAll(BULLET_POINT_PATTERN)]

  if (bulletMatches.length > 0) {
    const result: string[] = []
    let pos = 0

    for (let i = 0; i < bulletMatches.length; i++) {
      const bulletStart = bulletMatches[i].index!

      // Text before first bullet
      if (i === 0 && bulletStart > pos) {
        const pre = normalized.slice(pos, bulletStart).trim()
        if (pre) result.push(...splitTextByPunctuation(pre).filter(Boolean))
      }

      const nextBulletStart = i + 1 < bulletMatches.length
        ? bulletMatches[i + 1].index!
        : normalized.length

      const item = normalized.slice(bulletStart, nextBulletStart).trim()
      if (item) result.push(item)
      pos = nextBulletStart
    }

    if (pos < normalized.length) {
      const post = normalized.slice(pos).trim()
      if (post) result.push(...splitTextByPunctuation(post).filter(Boolean))
    }

    return result.filter(Boolean)
  }

  return splitTextByPunctuation(normalized)
}

// --- Non-verbal cue segmentation ---
function preprocessAndSegmentText(fullText: string): string[] {
  if (!fullText || /^\s*$/.test(fullText)) return []

  const segments: string[] = []
  const parts = fullText.split(NON_VERBAL_CUE_PATTERN)

  for (const part of parts) {
    if (!part || /^\s*$/.test(part)) continue

    NON_VERBAL_CUE_PATTERN.lastIndex = 0
    if (NON_VERBAL_CUE_PATTERN.test(part)) {
      // It's a non-verbal cue — keep as-is
      const trimmed = part.trim()
      if (trimmed) segments.push(trimmed)
    } else {
      const sentences = splitIntoSentences(part.trim())
      for (const s of sentences) {
        if (s) segments.push(s)
      }
    }
  }

  if (segments.length === 0 && fullText.trim()) {
    segments.push(fullText.trim())
  }

  return segments
}

// --- Main export ---

/**
 * Split text into TTS-ready chunks respecting sentence boundaries.
 * Mirrors Python's chunk_text_by_sentences() exactly.
 */
export function chunkTextBySentences(text: string, chunkSize: number): string[] {
  if (!text || /^\s*$/.test(text)) return []
  if (chunkSize <= 0) chunkSize = Infinity

  const segments = preprocessAndSegmentText(text)
  if (segments.length === 0) return []

  const chunks: string[] = []
  const currentChunk: string[] = []
  let currentLength = 0

  for (const segment of segments) {
    const segLen = segment.length

    if (currentChunk.length === 0) {
      currentChunk.push(segment)
      currentLength = segLen
    } else if (currentLength + 1 + segLen <= chunkSize) {
      currentChunk.push(segment)
      currentLength += 1 + segLen
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '))
      }
      currentChunk.length = 0
      currentChunk.push(segment)
      currentLength = segLen
    }

    // Single oversized segment — flush immediately
    if (currentLength > chunkSize && currentChunk.length === 1) {
      chunks.push(currentChunk.join(' '))
      currentChunk.length = 0
      currentLength = 0
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  const filtered = chunks.filter((c) => c.trim())
  if (filtered.length === 0 && text.trim()) return [text.trim()]
  return filtered
}
