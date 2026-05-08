/**
 * Sentiment Analyzer — local keyword-based sentiment detection
 * Returns { score, label, confidence } for complaint descriptions
 * No external API — runs entirely in the browser
 */

const KEYWORD_MAP = {
  distressed: [
    'terrified', 'panic', 'scared', 'afraid', 'fear', 'frightened',
    'trauma', 'terrible', 'awful', 'horrible', 'nightmare', 'helpless',
    'desperate', 'hopeless', 'suicidal', 'depressed', 'anxious',
    'unbearable', 'intimidated', 'threatened', 'unsafe',
  ],
  frustrated: [
    'annoyed', 'frustrated', 'irritated', 'fed up', 'sick of',
    'tired of', 'angry', 'mad', 'disappointed', 'dissatisfied',
    'neglected', 'ignored', 'overlooked', 'unfair', 'ridiculous',
    'absurd', 'pointless', 'waste',
  ],
  hopeful: [
    'hopeful', 'optimistic', 'confident', 'positive', 'encouraged',
    'excited', 'looking forward', 'grateful', 'thankful', 'appreciate',
    'improve', 'better', 'progress', 'support', 'helpful', 'kind',
    'trust', 'believe', 'reliable',
  ],
}

// Pre-build word sets for O(1) lookup (case-insensitive)
const KEYWORD_SETS = Object.fromEntries(
  Object.entries(KEYWORD_MAP).map(([label, words]) => [
    label,
    new Set(words.map(w => w.toLowerCase())),
  ])
)

/**
 * Analyze the sentiment of a given text.
 * @param {string} text — complaint description
 * @returns {{ score: number, label: string, confidence: 'high' | 'medium' | 'low' }|null}
 *          null if confidence is low (not enough signal)
 */
export function analyzeSentiment(text = '') {
  const normalized = String(text).toLowerCase().trim()
  if (!normalized) {
    return { score: 0, label: 'neutral', confidence: 'low' }
  }

  // Tokenize: split on non-word chars, filter empties
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.length === 0) {
    return { score: 0, label: 'neutral', confidence: 'low' }
  }

  // Count matches per category
  const counts = { distressed: 0, frustrated: 0, hopeful: 0 }

  for (const token of tokens) {
    for (const [label, wordSet] of Object.entries(KEYWORD_SETS)) {
      if (wordSet.has(token)) {
        counts[label] += 1
      }
    }
  }

  const distressCount = counts.distressed
  const frustrationCount = counts.frustrated
  const hopeCount = counts.hopeful

  // Total signal matches
  const totalSignals = distressCount + frustrationCount + hopeCount

  // Confidence based on signal density: at least 1 match per 20 tokens = high
  // 1 match per 10 tokens = medium, else low
  const ratio = totalSignals / tokens.length

  let confidence
  if (totalSignals === 0) {
    confidence = 'low'
  } else if (ratio >= 0.05 || totalSignals >= 3) {
    confidence = 'high'
  } else if (ratio >= 0.02 || totalSignals >= 2) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // If confidence is low, return null (caller should render nothing)
  if (confidence === 'low') {
    return null
  }

  // Determine dominant label
  // Distress gets highest weight (1.5x) — under-detecting distress is worse
  const WEIGHTS = { distressed: 1.5, frustrated: 1.0, hopeful: 1.0 }

  const weightedScores = {
    distressed: counts.distressed * WEIGHTS.distressed,
    frustrated: counts.frustrated * WEIGHTS.frustrated,
    hopeful: counts.hopeful * WEIGHTS.hopeful,
  }

  // Find max weighted category
  let maxLabel = 'neutral'
  let maxScore = 0

  for (const [label, score] of Object.entries(weightedScores)) {
    if (score > maxScore) {
      maxScore = score
      maxLabel = label
    }
  }

  // If there's a tie, prefer the more severe (distressed > frustrated > hopeful)
  // If all zero or no clear winner, label as neutral
  const allZero = Object.values(counts).every(c => c === 0)
  if (allZero || maxScore === 0) {
    return { score: 0, label: 'neutral', confidence }
  }

  // Check for ties among non-zero categories
  const maxCategories = Object.entries(weightedScores)
    .filter(([_, score]) => score === maxScore)
    .map(([label]) => label)

  if (maxCategories.length > 1) {
    // Tie-breaking severity order
    if (maxCategories.includes('distressed')) maxLabel = 'distressed'
    else if (maxCategories.includes('frustrated')) maxLabel = 'frustrated'
    else maxLabel = 'hopeful'
  }

  // Compute final normalized score in range [-1, 1]
  // Score magnitude reflects dominance of that sentiment
  // Formula: (weighted_count_for_label / (weighted_count_for_label + other_weighted_counts)) * direction
  const totalWeighted = weightedScores.distressed + weightedScores.frustrated + weightedScores.hopeful
  const labelShare = weightedScores[maxLabel] / totalWeighted

  // Direction: distressed = -1, frustrated = -0.6, neutral = 0, hopeful = +1
  const direction = {
    distressed: -1,
    frustrated: -0.6,
    neutral: 0,
    hopeful: 1,
  }[maxLabel]

  const score = direction * labelShare

  return {
    score: Number(score.toFixed(3)),
    label: maxLabel,
    confidence,
  }
}
