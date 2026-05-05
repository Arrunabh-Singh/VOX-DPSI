import { useState, useEffect } from 'react'
import api from '../utils/api'
import { DOMAINS } from '../utils/constants'

/**
 * ResolutionTemplatePicker
 *
 * Props:
 *   domain        — complaint domain (used to filter relevant templates)
 *   onSelect(text) — called with the template body when user picks one
 *   onClose()     — called when modal is dismissed
 */
export default function ResolutionTemplatePicker({ domain, onSelect, onClose }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [preview, setPreview]     = useState('')

  useEffect(() => {
    api.get(`/api/resolution-templates?active=1${domain ? `&domain=${domain}` : ''}`)
      .then(r => setTemplates(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [domain])

  const filtered = templates.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase())
  )

  const pick = (t) => {
    setSelected(t)
    setPreview(t.body)
  }

  const use = async () => {
    if (!selected) return
    // increment use count in background
    api.post(`/api/resolution-templates/${selected.id}/use`).catch(() => {})
    onSelect(preview)
  }

  const domainInfo = DOMAINS[domain]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff', maxWidth: '600px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(45,92,38,0.1)' }}>
          <div>
            <h2 className="font-black text-base" style={{ color: '#2d5c26' }}>📋 Resolution Templates</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {domainInfo ? `Showing templates for ${domainInfo.icon} ${domainInfo.label} and general use` : 'All resolution templates'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(45,92,38,0.08)' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            autoFocus
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1.5px solid rgba(45,92,38,0.18)', background: '#fafafa' }}
          />
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2d5c26', borderTopColor: 'transparent' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-500">No templates match your search</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              {filtered.map(t => {
                const isSelected = selected?.id === t.id
                const dom = t.domain !== 'any' ? DOMAINS[t.domain] : null
                return (
                  <button
                    key={t.id}
                    onClick={() => pick(t)}
                    className="w-full text-left px-5 py-3.5 transition-all"
                    style={{
                      background: isSelected ? 'rgba(45,92,38,0.06)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #2d5c26' : '3px solid transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: isSelected ? '#2d5c26' : '#1A1A1A' }}>
                        {isSelected && '✓ '}{t.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {dom && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: dom.color + '18', color: dom.color }}>
                            {dom.icon}
                          </span>
                        )}
                        {t.use_count > 0 && (
                          <span className="text-xs text-gray-400">{t.use_count}× used</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.body}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Preview + edit pane — shown when a template is selected */}
        {selected && (
          <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: 'rgba(45,92,38,0.12)', background: 'rgba(45,92,38,0.02)' }}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Preview &amp; Edit</p>
            <textarea
              value={preview}
              onChange={e => setPreview(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
              style={{ border: '1.5px solid rgba(45,92,38,0.2)', background: '#fff' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setSelected(null); setPreview('') }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">
                Clear
              </button>
              <button
                onClick={use}
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#2d5c26', color: '#c9a84c' }}
              >
                Use This Template ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
