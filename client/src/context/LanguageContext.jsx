import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from '../utils/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('vox_lang') || 'en' } catch { return 'en' }
  })

  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('vox_lang', l) } catch {}
  }, [])

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'en' ? 'hi' : 'en')
  }, [setLang])

  /**
   * Translate a key, optionally interpolating {token} placeholders.
   *
   * Usage:
   *   t('common.signOut')                        → "Sign out" / "साइन आउट"
   *   t('student.dashboard.welcome', { name })   → "Welcome, Rahul" / "नमस्ते, Rahul"
   *
   * Falls back: hi → en → key itself (so untranslated keys show the key string, not nothing).
   */
  const t = useCallback((key, vars = {}) => {
    const dict = translations[lang] || translations.en
    let val = dict[key] ?? translations.en[key] ?? key
    // Replace {token} placeholders
    Object.entries(vars).forEach(([k, v]) => {
      val = val.replaceAll(`{${k}}`, v ?? '')
    })
    return val
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
