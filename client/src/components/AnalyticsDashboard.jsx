import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { DOMAINS, STATUSES } from '../utils/constants'

const COLORS_PIE = ['#3B82F6','#F97316','#EF4444','#8B5CF6','#EAB308','#6B7280']

function StatCard({ label, value, sub, color = '#2d5c26' }) {
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <p className="text-4xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs font-semibold text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid rgba(45,92,38,0.15)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <p style={{ fontWeight: '700', color: '#2d5c26', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color || '#374151', fontSize: '12px' }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsDashboard({ complaints }) {
  // --- Compute analytics ---
  const total = complaints.length
  const resolved = complaints.filter(c => ['resolved','closed'].includes(c.status)).length
  const pending = total - resolved
  const urgent = complaints.filter(c => c.priority === 'urgent').length
  const appealed = complaints.filter(c => c.status === 'appealed').length

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Avg resolution time (resolved complaints only)
  const resolvedComplaints = complaints.filter(c => ['resolved','closed'].includes(c.status))
  const avgResolutionMs = resolvedComplaints.length > 0
    ? resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updated_at) - new Date(c.created_at)), 0) / resolvedComplaints.length
    : 0
  const avgResolutionHrs = Math.round(avgResolutionMs / 3600000)

  // Domain breakdown for pie chart
  const domainData = Object.entries(DOMAINS).map(([key, d]) => ({
    name: d.label,
    value: complaints.filter(c => c.domain === key).length,
    color: d.color,
  })).filter(d => d.value > 0)

  // Status breakdown for bar chart
  const statusData = Object.entries(STATUSES)
    .map(([key, s]) => ({
      name: s.label.replace('Escalated to ', 'Esc→'),
      value: complaints.filter(c => c.status === key).length,
      color: s.color,
    }))
    .filter(d => d.value > 0)

  // Complaints over time (last 7 days)
  const now = Date.now()
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * 86400000)
    const label = day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
    const end = start + 86400000
    const count = complaints.filter(c => {
      const t = new Date(c.created_at).getTime()
      return t >= start && t < end
    }).length
    return { name: label, Raised: count }
  })

  // Section breakdown (top 6)
  const sectionCounts = complaints.reduce((acc, c) => {
    const sec = c.student?.section || 'Unknown'
    acc[sec] = (acc[sec] || 0) + 1
    return acc
  }, {})
  const sectionData = Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Performance score for council members
  const councilStats = complaints.reduce((acc, c) => {
    const name = c.council_member?.name
    if (!name) return acc
    if (!acc[name]) acc[name] = { name, total: 0, resolved: 0, overdue: 0 }
    acc[name].total++
    if (['resolved','closed'].includes(c.status)) acc[name].resolved++
    const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000
    if (hrs > 48 && !['resolved','closed'].includes(c.status)) acc[name].overdue++
    return acc
  }, {})

  const performanceData = Object.values(councilStats).map(m => ({
    name: m.name.split(' ')[0],
    Score: m.total > 0
      ? Math.max(0, Math.round((m.resolved / m.total) * 100 - m.overdue * 10))
      : 0,
    Resolved: m.resolved,
    Total: m.total,
  })).sort((a, b) => b.Score - a.Score)

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Raised" value={total} color="#2d5c26" />
        <StatCard label="Resolved" value={resolved} color="#16A34A" sub={`${resolutionRate}% rate`} />
        <StatCard label="Pending" value={pending} color="#D97706" />
        <StatCard label="Urgent" value={urgent} color="#DC2626" />
        <StatCard label="Avg Resolution" value={avgResolutionHrs > 0 ? `${avgResolutionHrs}h` : 'N/A'} color="#4F46E5" />
      </div>

      {/* Row 1: pie + status bar */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Domain</h3>
          {domainData.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={domainData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {domainData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Status</h3>
          {statusData.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#374151' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Row 2: trend + section */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Complaints — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Raised" stroke="#2d5c26" strokeWidth={2.5} dot={{ fill: '#c9a84c', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>By Section (Top 8)</h3>
          {sectionData.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sectionData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#2d5c26" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Performance Scores */}
      {performanceData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-1 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Council Member Performance</h3>
          <p className="text-xs text-gray-400 mb-4">Score = (resolved/total × 100) − (overdue × 10)</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {performanceData.map(m => (
              <div key={m.name} className="rounded-xl px-4 py-3" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.1)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: '#2d5c26' }}>{m.name}</span>
                  <span className="text-lg font-black" style={{ color: m.Score >= 70 ? '#16A34A' : m.Score >= 40 ? '#D97706' : '#DC2626' }}>
                    {m.Score}
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#E5E7EB' }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(m.Score, 100)}%`, background: m.Score >= 70 ? '#16A34A' : m.Score >= 40 ? '#D97706' : '#DC2626' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{m.Resolved}/{m.Total} resolved</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
