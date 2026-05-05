// ── Urgency keywords ──────────────────────────────────────────────────────────
const URGENT_KEYWORDS = [
  'bullying', 'bully', 'bullied', 'harass', 'harassment',
  'unsafe', 'scared', 'afraid', 'fear', 'frightened',
  'threatened', 'threat', 'hurt', 'hitting', 'hit me',
  'abuse', 'abused', 'ragging', 'ragged', 'fight',
  'violence', 'violent', 'weapon', 'danger', 'dangerous',
  'help me', 'please help',
]

export function detectUrgency(text) {
  const lower = text.toLowerCase()
  return URGENT_KEYWORDS.find(kw => lower.includes(kw)) || null
}

// ── POSH Act 2013 keywords ────────────────────────────────────────────────────
// Triggers mandatory Internal Committee routing — bypasses ALL student handlers
const POSH_KEYWORDS = [
  'sexual harassment', 'sexually harassed', 'unwanted touch', 'inappropriate touch',
  'touched me', 'touched inappropriately', 'molest', 'molestation', 'molested',
  'groped', 'groping', 'forced to touch', 'made me touch', 'physical advances',
  'unwanted physical', 'sexual comments', 'sexual remarks', 'sexual jokes',
  'showing obscene', 'obscene material', 'sexual favour', 'sexual demand',
  'posh', 'internal committee', 'gender harassment', 'eve teasing',
]

// ── POCSO Act 2012 keywords ───────────────────────────────────────────────────
// Triggers mandatory police reporting — criminal liability if school delays
const POCSO_KEYWORDS = [
  'child abuse', 'sexually abused', 'sexual abuse', 'penetration', 'rape',
  'assault me sexually', 'sexual assault', 'forced sex', 'private parts',
  'touched my private', 'private area', 'pocso', 'child sexual',
  'naked photo', 'nude photo', 'indecent photo', 'pornography shown',
  'blackmail sexually', 'sexual blackmail',
]

/**
 * Returns null if no POSH/POCSO keyword detected.
 * Returns { type: 'POSH' | 'POCSO', keyword: string } if detected.
 * POCSO takes priority over POSH when both match.
 */
export function detectPoshPocso(text) {
  const lower = text.toLowerCase()
  const pocsoMatch = POCSO_KEYWORDS.find(kw => lower.includes(kw))
  if (pocsoMatch) return { type: 'POCSO', keyword: pocsoMatch }
  const poshMatch = POSH_KEYWORDS.find(kw => lower.includes(kw))
  if (poshMatch) return { type: 'POSH', keyword: poshMatch }
  return null
}
