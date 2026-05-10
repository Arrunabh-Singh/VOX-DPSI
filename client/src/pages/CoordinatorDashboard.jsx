import { useState, useEffect, useMemo, useCallback } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ComplaintCard from '../components/ComplaintCard'
import { SkeletonList } from '../components/SkeletonCard'
import Footer from '../components/Footer'
import { DOMAINS, STATUSES } from '../utils/constants'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import ErasureRequestsPanel from '../components/ErasureRequestsPanel'
import { WorkflowTemplatesPanelWithAuth } from '../components/WorkflowTemplatesPanel'
import BulkActionBar from '../components/BulkActionBar'
import MeetingAgendaGenerator from '../components/MeetingAgendaGenerator'
import DelegationManager from '../components/DelegationManager'
import AssignmentRulesPanel from '../components/AssignmentRulesPanel'
import api from '../utils/api'

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'escalated_to_coordinator', label: 'New' },
  { key: 'in_progress',              label: 'In Progress' },
  { key: 'escalated_to_principal',   label: 'To Principal' },
  { key: 'resolved',                 label: 'Resolved' },
]

export default function CoordinatorDashboard() {
  const { user } = useAuth()
  const { complaints, loading, refetch } = useComplaints()
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [activeTab, setActiveTab] = useState('complaints')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [councilMembers, setCouncilMembers] = useState([])
  useEffect(() => { document.title = 'Coordinator — Vox DPSI' }, [])

  // Fetch council members for bulk-assign
  useEffect(() => {
    api.get('/api/users?role=council_member')
      .then(res => setCouncilMembers(res.data || []))
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => complaints
    .filter(c => !statusFilter || c.status === statusFilter)
    .filter(c => !domainFilter || c.domain === domainFilter),
  [complaints, statusFilter, domainFilter])

  const stats = [
    { label: 'Total',           value: complaints.length,                                                      color: '#2d5c26' },
    { label: 'Needs Attention', value: complaints.filter(c => c.status === 'escalated_to_coordinator').length, color: '#D97706' },
    { label: 'To Principal',    value: complaints.filter(c => c.status === 'escalated_to_principal').length,   color: '#DC2626' },
    { label: 'Resolved',        value: complaints.filter(c => c.status === 'resolved').length,                 color: '#16A34A' },
  ]

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  return (
    <div className="min-h-screen" style={{ background: '#eae1c4' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#2d5c26' }}>Coordinator Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[{ key: 'complaints', label: '📋 Complaints' }, { key: 'analytics', label: '📊 Analytics' }, { key: 'agenda', label: '📅 Meeting Agenda' }, { key: 'erasure', label: '🗑️ Erasure Requests' }, { key: 'workflows', label: '⚙️ Workflows' }, { key: 'rules', label: '⚙️ Assignment Rules' }, { key: 'delegation', label: '🔁 Delegations' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={activeTab === t.key
                ? { background: '#2d5c26', color: '#c9a84c' }
                : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'complaints' && (
          <>
            <div className="flex gap-3 mb-3 flex-wrap items-center">
              <div className="flex gap-2 overflow-x-auto">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                    style={statusFilter === f.key
                      ? { background: '#2d5c26', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
                  >{f.label}</button>
                ))}
              </div>
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
                style={{ border: '1px solid rgba(45,92,38,0.15)', background: 'rgba(255,255,255,0.8)', color: '#2d5c26' }}
              >
                <option value="">All Domains</option>
                {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.label}</option>)}
              </select>
              <span className="text-xs text-gray-400 font-medium">{filtered.length} of {complaints.length}</span>

              {/* Bulk mode toggle */}
              <button
                onClick={() => { setBulkMode(!bulkMode); clearSelection() }}
                className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={bulkMode
                  ? { background: '#2d5c26', color: '#c9a84c' }
                  : { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(45,92,38,0.12)', color: '#2d5c26' }}
              >
                {bulkMode ? '✓ Bulk Mode ON' : '⬛ Bulk Select'}
              </button>
            </div>

            {/* Select all row (bulk mode only) */}
            {bulkMode && filtered.length > 0 && (
              <div
                className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(45,92,38,0.06)', border: '1px solid rgba(45,92,38,0.1)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-green-800"
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-xs font-semibold text-gray-600 cursor-pointer">
                  Select all {filtered.length} visible complaints
                </label>
                {selectedIds.size > 0 && (
                  <span className="ml-auto text-xs font-bold" style={{ color: '#2d5c26' }}>
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <SkeletonList count={3} />
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-5xl mb-3">📭</p>
                <h3 className="font-bold text-gray-700 text-lg">No complaints match your filters</h3>
              </div>
            ) : (
              <div className={`grid gap-3 ${selectedIds.size > 0 ? 'pb-28' : ''} sm:grid-cols-2 lg:grid-cols-3`}>
                {filtered.map(c => (
                  <div
                    key={c.id}
                    onClick={bulkMode ? () => toggleSelect(c.id) : undefined}
                    className={bulkMode ? 'cursor-pointer' : ''}
                    style={bulkMode ? {
                      outline: selectedIds.has(c.id) ? '2px solid #2d5c26' : '2px solid transparent',
                      borderRadius: '16px',
                      opacity: selectedIds.size > 0 && !selectedIds.has(c.id) ? 0.6 : 1,
                      transition: 'outline 0.1s, opacity 0.15s',
                    } : {}}
                  >
                    {bulkMode && (
                      <div className="relative">
                        <div
                          className="absolute top-3 left-3 z-10 w-5 h-5 rounded-md flex items-center justify-center"
                          style={{
                            background: selectedIds.has(c.id) ? '#2d5c26' : 'rgba(255,255,255,0.9)',
                            border: `2px solid ${selectedIds.has(c.id) ? '#2d5c26' : '#D1D5DB'}`,
                          }}
                          onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}
                        >
                          {selectedIds.has(c.id) && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                      </div>
                    )}
                    <ComplaintCard complaint={c} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard complaints={complaints} showCouncilPerformance={false} />}
        {activeTab === 'agenda' && <MeetingAgendaGenerator complaints={complaints} />}
        {activeTab === 'erasure' && <ErasureRequestsPanel />}
{activeTab === 'workflows' && <WorkflowTemplatesPanelWithAuth canWrite={true} />}
{activeTab === 'rules' && <AssignmentRulesPanel />}
{activeTab === 'delegation' && <DelegationManager currentUser={user} />}
      </main>
      <Footer />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearSelection}
        onSuccess={refetch}
        councilMembers={councilMembers}
      />
    </div>
  )
}
