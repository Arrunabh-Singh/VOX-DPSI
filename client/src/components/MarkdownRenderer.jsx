import DOMPurify from 'dompurify'

/**
 * MarkdownRenderer
 *
 * Renders a tiny subset of Markdown as sanitized HTML.
 * Supports: **bold**, _italic_, ~~strikethrough~~, `code`,
 *           - bullet lists, 1. numbered lists, blank-line paragraphs.
 *
 * Props:
 *   text      — raw Markdown string
 *   className — optional extra class names for the wrapper
 *   style     — optional inline styles
 */

function parseInline(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(45,92,38,0.08);padding:1px 5px;border-radius:4px;font-size:0.9em;font-family:monospace">$1</code>')
}

function parseMarkdown(raw) {
  if (!raw) return ''

  const lines = raw.split('\n')
  const html  = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Bullet list item
    if (/^[-*]\s/.test(line)) {
      html.push('<ul style="margin:4px 0 4px 0;padding-left:20px">')
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        html.push(`<li style="margin:2px 0">${parseInline(lines[i].replace(/^[-*]\s/, ''))}</li>`)
        i++
      }
      html.push('</ul>')
      continue
    }

    // Numbered list item
    if (/^\d+\.\s/.test(line)) {
      html.push('<ol style="margin:4px 0 4px 0;padding-left:20px">')
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        html.push(`<li style="margin:2px 0">${parseInline(lines[i].replace(/^\d+\.\s/, ''))}</li>`)
        i++
      }
      html.push('</ol>')
      continue
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      html.push('<br/>')
      i++
      continue
    }

    // Regular paragraph line
    html.push(`<p style="margin:0 0 2px 0;line-height:1.6">${parseInline(line)}</p>`)
    i++
  }

  return html.join('')
}

export default function MarkdownRenderer({ text, className = '', style = {} }) {
  if (!text) return null

  const rawHtml = parseMarkdown(text)
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'code', 'br'],
    ALLOWED_ATTR: ['style'],
  })

  return (
    <div
      className={`text-sm leading-relaxed ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
