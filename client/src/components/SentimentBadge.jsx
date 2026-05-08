import { useMemo } from 'react'
import { analyzeSentiment } from '../utils/sentimentAnalyzer'

const STYLES = {
  distressed: {
    background: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    emoji: '😰',
    label: 'Distressed',
  },
  frustrated: {
    background: '#FFF7ED',
    color: '#D97706',
    border: '1px solid #FED7AA',
    emoji: '😤',
    label: 'Frustrated',
  },
  neutral: {
    background: '#F3F4F6',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    emoji: '😐',
    label: 'Neutral',
  },
  hopeful: {
    background: '#F0FDF4',
    color: '#16A34A',
    border: '1px solid #BBF7D0',
    emoji: '🌱',
    label: 'Hopeful',
  },
}

/**
 * SentimentBadge — renders a small pill indicating emotional tone
 * Only displays when sentiment confidence is medium or high.
 * For low-confidence results, renders nothing.
 */
export default function SentimentBadge({ text }) {
  const sentiment = useMemo(() => {
    if (!text || typeof text !== 'string') return null
    return analyzeSentiment(text)
  }, [text])

  // Do not render if confidence is low or analysis returned null
  if (!sentiment || sentiment.confidence === 'low') {
    return null
  }

  const style = STYLES[sentiment.label] || STYLES.neutral

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: style.background,
        color: style.color,
        border: style.border,
      }}
      title={`Sentiment: ${sentiment.label} (confidence: ${sentiment.confidence}, score: ${sentiment.score})`}
    >
      <span>{style.emoji}</span>
      <span>{style.label}</span>
    </span>
  )
}
