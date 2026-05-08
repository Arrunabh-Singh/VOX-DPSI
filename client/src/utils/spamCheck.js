const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

export function getDescriptionSpamSignals(description = '') {
  const text = String(description).trim()
  const totalCharacters = text.length

  let repeatedCharacters = 0
  let runLength = 1

  for (let i = 1; i <= text.length; i += 1) {
    if (text[i] === text[i - 1]) {
      runLength += 1
      continue
    }

    if (runLength > 1) repeatedCharacters += runLength
    runLength = 1
  }

  let alphabeticCharacters = 0
  let vowels = 0

  for (const char of text.toLowerCase()) {
    if (!/[a-z]/.test(char)) continue
    alphabeticCharacters += 1
    if (VOWELS.has(char)) vowels += 1
  }

  const repeatedCharacterRatio = totalCharacters ? repeatedCharacters / totalCharacters : 0
  const vowelRatio = alphabeticCharacters ? vowels / alphabeticCharacters : 0

  const signals = {
    hasHighConsecutiveRepeats: repeatedCharacterRatio > 0.4,
    isLongUnbrokenString: totalCharacters > 3 && !/\s/.test(text),
    hasLowVowelRatio: vowelRatio < 0.15,
  }

  return {
    ...signals,
    suspiciousSignalCount: Object.values(signals).filter(Boolean).length,
    repeatedCharacterRatio,
    vowelRatio,
  }
}

export function isSuspiciousDescription(description = '') {
  return getDescriptionSpamSignals(description).suspiciousSignalCount >= 2
}
