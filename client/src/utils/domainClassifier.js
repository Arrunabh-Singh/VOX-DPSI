export const DOMAIN_KEYWORDS = {
  academics: [
    'homework', 'assignment', 'exam', 'test', 'marks', 'grade', 'teacher',
    'classwork', 'syllabus', 'lesson', 'project', 'attendance', 'period',
    'subject', 'notebook',
  ],
  infrastructure: [
    'classroom', 'bench', 'desk', 'fan', 'light', 'toilet', 'washroom',
    'water', 'bus', 'library', 'lab', 'playground', 'canteen', 'broken',
    'repair',
  ],
  safety: [
    'unsafe', 'injury', 'hurt', 'accident', 'threat', 'emergency', 'fire',
    'medical', 'first aid', 'security', 'danger', 'harassment', 'violence',
    'evacuation', 'risk',
  ],
  personal: [
    'anxiety', 'stress', 'mental', 'privacy', 'personal', 'family',
    'counselling', 'health', 'wellbeing', 'confidential', 'support',
    'pressure', 'sad', 'depressed', 'alone',
  ],
  behaviour: [
    'bullying', 'teasing', 'fight', 'rude', 'misbehaviour', 'abuse',
    'disrespect', 'name calling', 'mocking', 'argument', 'shouting',
    'pushing', 'threatening', 'discrimination', 'rumour',
  ],
  other: [
    'request', 'suggestion', 'feedback', 'event', 'notice', 'schedule',
    'certificate', 'lost', 'found', 'id card', 'permission', 'club',
    'assembly', 'general', 'miscellaneous',
  ],
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function classifyDomain(text = '') {
  const normalized = String(text).toLowerCase()
  if (!normalized.trim()) return null

  let bestDomain = null
  let bestScore = 0

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = keywords.reduce((hits, keyword) => {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword.toLowerCase())}([^a-z0-9]|$)`, 'g')
      return hits + (normalized.match(pattern)?.length || 0)
    }, 0)

    if (score > bestScore) {
      bestDomain = domain
      bestScore = score
    }
  }

  return bestScore >= 2 ? bestDomain : null
}
