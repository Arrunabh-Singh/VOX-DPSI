import { useState, useEffect } from 'react'
import api from '../utils/api'
import { DOMAINS } from '../utils/constants'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  council_member:  'Council Member',
  class_teacher:   'Class Teacher',
  coordinator:     'Coordinator',
  principal:       'Principal',
}

const ROLE_COLORS = {
  council_member: '#3B82F6',
  class_teacher:  '#8B5CF6',
  coordinator:    '#D97706',
  principal:      '#DC2626',
}

const ALL_ROLES = ['council_member', 'class_teacher', 'coordinator', 'principal']

function EscalationPathEditor({ value, onChange }) {
  const toggle = (role) => {
    // council_member is always first and mandatory
    if (role === 'council_member') return
    const next = value.includes(role) ? value.filter(r => r !== role) : [...value, role]
    // Always keep council_member first, maintain order
    const ordered = ALL_ROLES.filter(r => next.includes(r))
    onChange(ordered)
  }

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
        Escalation Path
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {ALL_ROLES.map(role => {
          const active = value.includes(role)
          const isFirst = role === 'council_member'
          const idx = value.indexOf(role)
          return (
            <button
              key={role}
              type="button"
              disabled={isFirst}
              onClick={() => toggle(role)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: active ? ROLE_COLORS[role] + '18' : 'rgba(0,0,0,0.04)',
                border: `1.5px solid ${active ? ROLE_COLORS[role] : 'rgba(0,0,0,0.1)'}`,
                color: active ? ROLE_COLORS[role] : '#9CA3AF',
                cursor: isFirst ? 'default' : 'pointer',
                opacity: isFirst ? 0.8 : 1,
              }}
            >
              {active && <span className="font-black" style={{ color: ROLE_COLORS[role] }}>{idx + 1}</span>}
              {!active && <span>+</span>}
              {ROLE_LABELS[role]}
              {isFirst && <span className="text-gray-400 font-normal">(required)</span>}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {value.map((role, i) => (
          <span key={role} className="flex items-center gap-1 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded-lg" style={{ background: ROLE_COLORS[role] + '18', color: ROLE_COLORS[role] }}>
              {ROLE_LABELS[role]}
            </span>
            {i < value.length - 1 && <span className="text-gray-400">→</span>}
          </span>
        ))}
        <span className="text-xs text-gray-400">→ Resolved</span>
      </div>
    </div>
  )
}

function TemplateCard({ template, onEdit, canWrite }) {
  const domain = DOMAINS[template.domain]
  const path   = Array.isArray(template.escalation_path) ? template.escalation_path : []

  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col gap-3"
      style={{ opacity: template.is_active ? 1 : 0.55, border: template.is_active ? 'none' : '1.5px dashed rgba(0,0,0,0.15)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg">{domain?.icon}</span>
            <span className="font-black text-sm" style={{ color: domain?.color }}>{template.name}</span>
            {!template.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-400">Inactive</span>
            )}
            {template.auto_urgent && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DC262618', color: '#DC2626' }}>Auto-Urgent</span>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>
          )}
        </div>
        {canWrite && (
          <button
            onClick={() => onEdit(template)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(45,92,38,0.08)', color: '#2d5c26', border: '1px solid rgba(45,92,38,0.15)' }}
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Escalation path */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        {path.map((role, i) => (
          <span key={role} className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-lg font-semibold" style={{ background: ROLE_COLORS[role] + '18', color: ROLE_COLORS[role] }}>
              {ROLE_LABELS[role] || role}
            </span>
            {i < path.length - 1 && <span className="text-gray-400">→</span>}
          </span>
        ))}
        <span className="text-gray-400">→ Resolved</span>
      </div>

      {/* Metadata row */}
      <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
        {template.sla_override_hours ? (
          <span>⏱ SLA: <strong style={{ color: template.sla_override_hours <= 24 ? '#DC2626' : '#D97706' }}>{template.sla_override_hours}h</strong></span>
        ) : (
          <span>⏱ SLA: <span className="text-gray-400">global default (72h)</span></span>
        )}
        {template.skip_teacher && <span className="font-semibold text-purple-600">⤵ Skip class teacher</span>}
      </div>

      {template.handler_guidance && (
        <div className="rounded-xl px-3 py-2 text-xs text-gray-600 leading-relaxed" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.08)' }}>
          <span className="font-semibold text-gray-700">Handler guidance: </span>{template.handler_guidance}
        </div>
      )}
    </div>
  )
}

function EditModal({ template, onClose, onSaved }) {
  const domain = DOMAINS[template.domain]
  const [form, setForm] = useState({
    name:               template.name || '',
    description:        template.description || '',
    escalation_path:    Array.isArray(template.escalation_path) ? template.escalation_path : ['council_member','class_teacher','coordinator','principal'],
    sla_override_hours: template.sla_override_hours ?? '',
    auto_urgent:        template.auto_urgent ?? false,
    skip_teacher:       template.skip_teacher ?? false,
    handler_guidance:   template.handler_guidance || '',
    is_active:          template.is_active !== false,
  })
  const [saving, setSaving] = useState(false)

  // When skip_teacher is toggled, also update escalation_path
  const handleSkipTeacher = (val) => {
    const newPath = val
      ? form.escalation_path.filter(r => r !== 'class_teacher')
      : (() => {
          const p = [...form.escalation_path]
          if (!p.includes('class_teacher')) {
            const idx = p.indexOf('coordinator')
            if (idx > -1) p.splice(idx, 0, 'class_teacher')
            else p.push('class_teacher')
          }
          return p
        })()
    setForm(f => ({ ...f, skip_teacher: val, escalation_path: newPath }))
  }

  const save = async () => {
    if (form.name.trim().length < 3) return toast.error('Template name is too short')
    setSaving(true)
    try {
      const payload = {
        ...form,
        sla_override_hours: form.sla_override_hours === '' ? null : parseInt(form.sla_override_hours),
      }
      const { data } = await api.put(`/api/workflow-templates/${template.domain}`, payload)
      toast.success(`${domain?.label} template saved`)
      onSaved(data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-xl px-3 py-2 text-sm focus:outline-none'
  const inputStyle = { border: '1.5px solid rgba(45,92,38,0.2)', background: '#fafafa' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(45,92,38,0.12)' }}>
          <div>
            <h2 className="font-black text-lg" style={{ color: '#2d5c26' }}>
              {domain?.icon} Edit {domain?.label} Template
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure escalation path, SLA, and handler guidance</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Template Name</label>
            <input className={input} style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Description</label>
            <input className={input} style={inputStyle} placeholder="Short description of when this template applies"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <EscalationPathEditor
            value={form.escalation_path}
            onChange={path => setForm(f => ({ ...f, escalation_path: path, skip_teacher: !path.includes('class_teacher') }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">SLA Override (hours)</label>
              <input
                type="number" min={1} max={720} placeholder="Leave blank to use global (72h)"
                className={input} style={inputStyle}
                value={form.sla_override_hours}
                onChange={e => setForm(f => ({ ...f, sla_override_hours: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.auto_urgent}
                  onChange={e => setForm(f => ({ ...f, auto_urgent: e.target.checked }))}
                  className="rounded accent-red-600 w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">Auto-urgent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.skip_teacher}
                  onChange={e => handleSkipTeacher(e.target.checked)}
                  className="rounded accent-purple-600 w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">Skip class teacher</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded accent-green-700 w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">Template active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Handler Guidance</label>
            <textarea
              rows={3}
              placeholder="Guidance note shown to council member when handling this type of complaint..."
              className={input + ' resize-none'} style={inputStyle}
              value={form.handler_guidance}
              onChange={e => setForm(f => ({ ...f, handler_guidance: e.target.value }))}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'rgba(45,92,38,0.12)' }}>
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button
            disabled={saving}
            onClick={save}
            className="px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-2"
            style={{ background: '#2d5c26', color: '#c9a84c' }}
          >
            {saving ? <><span className="inline-block w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Saving…</> : '💾 Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowTemplatesPanel() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)
  const { user } = (typeof window !== 'undefined') ? { user: null } : {}

  // Check if current user can write (read from context via prop or hook)
  // We'll receive canWrite as a prop from the parent
  useEffect(() => {
    api.get('/api/workflow-templates')
      .then(r => setTemplates(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (updated) => {
    setTemplates(prev => prev.map(t => t.domain === updated.domain ? updated : t))
    setEditing(null)
  }

  // canWrite prop passed by parent, or default based on auth context
  return (
    <WorkflowTemplatesPanelInner
      templates={templates}
      loading={loading}
      editing={editing}
      setEditing={setEditing}
      handleSaved={handleSaved}
    />
  )
}

// Exported inner component that accepts canWrite prop
export function WorkflowTemplatesPanelWithAuth({ canWrite = false }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)

  useEffect(() => {
    api.get('/api/workflow-templates')
      .then(r => setTemplates(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (updated) => {
    setTemplates(prev => prev.map(t => t.domain === updated.domain ? updated : t))
    setEditing(null)
  }

  return (
    <WorkflowTemplatesPanelInner
      templates={templates}
      loading={loading}
      editing={editing}
      setEditing={setEditing}
      handleSaved={handleSaved}
      canWrite={canWrite}
    />
  )
}

function WorkflowTemplatesPanelInner({ templates, loading, editing, setEditing, handleSaved, canWrite = false }) {
  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="glass rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base" style={{ color: '#2d5c26' }}>Workflow Templates</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Define escalation paths, SLA overrides, and handler guidance per complaint domain.
            {!canWrite && ' Contact your coordinator to modify these settings.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map(t => (
          <TemplateCard
            key={t.domain}
            template={t}
            onEdit={setEditing}
            canWrite={canWrite}
          />
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-gray-500 font-medium">No workflow templates found</p>
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
