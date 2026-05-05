import { useRef } from 'react'

/**
 * RichTextEditor
 *
 * A textarea augmented with a mini formatting toolbar.
 * Stores content as plain Markdown — no external library required.
 *
 * Props:
 *   value       — controlled string value (Markdown)
 *   onChange(v) — called with new string when content changes
 *   placeholder — textarea placeholder text
 *   rows        — textarea rows (default 5)
 *   minLength   — minimum length for validation hint
 *   maxLength   — maximum length (default 1000)
 *   style       — optional extra styles for the outer wrapper
 */
export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  rows = 5,
  minLength = 50,
  maxLength = 1000,
  style = {},
}) {
  const textareaRef = useRef(null)

  // ── Toolbar actions ──────────────────────────────────────────────────────

  /**
   * Wrap the selected text with `prefix` and `suffix`.
   * If nothing is selected, inserts placeholder text.
   */
  const wrapSelection = (prefix, suffix, sampleText) => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const selected = value.slice(start, end) || sampleText

    const before = value.slice(0, start)
    const after  = value.slice(end)
    const next   = `${before}${prefix}${selected}${suffix}${after}`

    onChange(next)

    // Restore cursor / selection after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      const newSelStart = start + prefix.length
      const newSelEnd   = newSelStart + selected.length
      ta.setSelectionRange(newSelStart, newSelEnd)
    })
  }

  /**
   * Prefix selected lines (or the current line) with `linePrefix`.
   * E.g. "- " for bullet lists, "1. " for numbered lists.
   */
  const prefixLines = (linePrefix, sample = 'Item') => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const start = ta.selectionStart
    const end   = ta.selectionEnd

    // Find the start of the first selected line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    // Find the end of the last selected line
    let lineEnd = value.indexOf('\n', end)
    if (lineEnd === -1) lineEnd = value.length

    const selectedLines = value.slice(lineStart, lineEnd)
    const before = value.slice(0, lineStart)
    const after  = value.slice(lineEnd)

    // If no text is selected at all, insert a sample line
    if (start === end) {
      const insert = `\n${linePrefix}${sample}`
      onChange(value.slice(0, end) + insert + value.slice(end))
      requestAnimationFrame(() => {
        ta.focus()
        const pos = end + insert.length
        ta.setSelectionRange(pos, pos)
      })
      return
    }

    const prefixed = selectedLines
      .split('\n')
      .map(line => {
        // Toggle: remove prefix if already present
        if (line.startsWith(linePrefix)) return line.slice(linePrefix.length)
        return `${linePrefix}${line}`
      })
      .join('\n')

    onChange(before + prefixed + after)
  }

  const tools = [
    {
      label: 'B',
      title: 'Bold (Ctrl+B)',
      style: { fontWeight: '900', fontFamily: 'serif' },
      action: () => wrapSelection('**', '**', 'bold text'),
    },
    {
      label: 'I',
      title: 'Italic (Ctrl+I)',
      style: { fontStyle: 'italic', fontFamily: 'serif' },
      action: () => wrapSelection('_', '_', 'italic text'),
    },
    {
      label: '—',
      title: 'Strikethrough',
      style: { textDecoration: 'line-through', fontSize: '11px' },
      action: () => wrapSelection('~~', '~~', 'text'),
    },
    { separator: true },
    {
      label: '•',
      title: 'Bullet list',
      style: { fontSize: '18px', lineHeight: '1' },
      action: () => prefixLines('- '),
    },
    {
      label: '1.',
      title: 'Numbered list',
      style: { fontSize: '11px', fontWeight: '700' },
      action: () => prefixLines('1. '),
    },
  ]

  // Keyboard shortcuts inside the textarea
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); wrapSelection('**', '**', 'bold text') }
      if (e.key === 'i') { e.preventDefault(); wrapSelection('_', '_', 'italic text') }
    }
  }

  const remaining = maxLength - value.length
  const isUnder   = value.length < minLength

  return (
    <div style={{ ...style }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1 rounded-t-xl"
        style={{ background: 'rgba(45,92,38,0.05)', borderTop: '1.5px solid rgba(45,92,38,0.15)', borderLeft: '1.5px solid rgba(45,92,38,0.15)', borderRight: '1.5px solid rgba(45,92,38,0.15)' }}
      >
        {tools.map((tool, i) =>
          tool.separator ? (
            <div key={i} style={{ width: '1px', height: '18px', background: 'rgba(45,92,38,0.18)', margin: '0 3px' }} />
          ) : (
            <button
              key={i}
              type="button"
              title={tool.title}
              onMouseDown={e => { e.preventDefault(); tool.action() }} // prevent blur
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-sm"
              style={{
                ...tool.style,
                color: '#2d5c26',
                background: 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,92,38,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {tool.label}
            </button>
          )
        )}
        <span className="ml-auto text-xs font-medium" style={{ color: 'rgba(45,92,38,0.4)', fontSize: '10px' }}>
          Markdown
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm resize-none focus:outline-none"
        style={{
          border: '1.5px solid rgba(45,92,38,0.15)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          background: 'rgba(255,255,255,0.85)',
          fontFamily: 'inherit',
          lineHeight: '1.6',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = '#2d5c26'; e.target.style.borderTopColor = 'transparent' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(45,92,38,0.15)'; e.target.style.borderTopColor = 'transparent' }}
      />

      {/* Counter */}
      <p className={`text-xs mt-1 flex gap-3 ${isUnder ? 'text-gray-400' : 'text-green-600'}`}>
        <span>{isUnder ? `${minLength - value.length} more characters needed` : `✓ Length OK`}</span>
        <span className="ml-auto" style={{ color: remaining < 100 ? '#D97706' : '#9CA3AF' }}>
          {value.length}/{maxLength}
        </span>
      </p>
    </div>
  )
}
