import { getTemplatesForDomain } from '../utils/resolutionTemplates'

const STYLES = {
  default: {
    background: '#F0FDF4',
    border: '1.5px solid #BBF7D0',
    text: '#166534',
    hoverBg: '#DCFCE7',
    selectedBg: '#16A34A',
    selectedText: '#FFFFFF',
  },
}

/**
 * ResolutionSuggestions — clickable template pills for council members
 * Shows up to 3 suggested resolution notes for the current complaint domain.
 * Visible only to staff (council_member, coordinator, principal, supervisor).
 */
export default function ResolutionSuggestions({ domain, onSelect, selectedText = '' }) {
  const templates = getTemplatesForDomain(domain)

  if (!templates || templates.length === 0) {
    return null
  }

  const style = STYLES.default

  return (
    <div className="mb-2 space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">AI Suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((template, idx) => {
          const isSelected = selectedText.trim() === template.trim()
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(template)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-all text-left"
              style={{
                background: isSelected ? style.selectedBg : style.background,
                color: isSelected ? style.selectedText : style.text,
                border: isSelected ? '1.5px solid #15803d' : style.border,
                cursor: 'pointer',
                outline: isSelected ? '2px solid #15803d' : 'none',
                outlineOffset: '1px',
              }}
              title={isSelected ? 'Selected' : 'Click to use this template'}
            >
              {isSelected ? '✓ ' : ''}
              {template.length > 80 ? template.slice(0, 80) + '…' : template}
            </button>
          )
        })}
      </div>
    </div>
  )
}
