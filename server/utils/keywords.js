const URGENT_KEYWORDS = [
  'bullying', 'bully', 'bullied', 'harass', 'harassment',
  'unsafe', 'scared', 'afraid', 'fear', 'frightened',
  'threatened', 'threat', 'hurt', 'hitting', 'hit me',
  'abuse', 'abused', 'ragging', 'ragged', 'fight',
  'violence', 'violent', 'weapon', 'danger', 'dangerous',
  'help me', 'please help'
]

export function detectUrgency(text) {
  const lower = text.toLowerCase()
  return URGENT_KEYWORDS.find(kw => lower.includes(kw)) || null
}
