import { useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter,
} from 'recharts'
import { DOMAINS, STATUSES } from '../utils/constants'

// ─── SLA threshold (hours) ──────────────────────────────────────────────────
const SLA_HRS = 72

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

// ─── Export helpers ─────────────────────────────────────────────────────────
function downloadCSV(filename, rows) {
  const csv  = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c.replace(/"/g,'""')}"` : c).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsDashboard({ complaints, showCouncilPerformance = true }) {
  const analytics = useMemo(() => {
    const total = complaints.length
    const resolved = complaints.filter(c => ['resolved','closed'].includes(c.status)).length
    const pending = total - resolved
    const urgent = complaints.filter(c => c.priority === 'urgent').length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    const resolvedComplaints = complaints.filter(c => ['resolved','closed'].includes(c.status))
    const avgResolutionMs = resolvedComplaints.length > 0
      ? resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updated_at) - new Date(c.created_at)), 0) / resolvedComplaints.length
      : 0
    const avgResolutionHrs = Math.round(avgResolutionMs / 3600000)

    const domainData = Object.entries(DOMAINS).map(([key, d]) => ({
      name: d.label, value: complaints.filter(c => c.domain === key).length, color: d.color,
    })).filter(d => d.value > 0)

    const statusData = Object.entries(STATUSES)
      .map(([key, s]) => ({
        name: s.label.replace('Escalated to ', 'Esc→'),
        value: complaints.filter(c => c.status === key).length,
        color: s.color,
      })).filter(d => d.value > 0)

    const now = Date.now()
    const timelineData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now - (6 - i) * 86400000)
      const label = day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
      const end = start + 86400000
      const count = complaints.filter(c => { const t = new Date(c.created_at).getTime(); return t >= start && t < end }).length
      return { name: label, Raised: count }
    })

    const sectionCounts = complaints.reduce((acc, c) => { const sec = c.student?.section || 'Unknown'; acc[sec] = (acc[sec] || 0) + 1; return acc }, {})
    const sectionData = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))

    const councilStats = complaints.reduce((acc, c) => {
      const id = c.council_member?.id; const name = c.council_member?.name
      if (!id || !name) return acc
      if (!acc[id]) acc[id] = { id, name, total: 0, resolved: 0, overdue: 0, inProgress: 0 }
      acc[id].total++
      if (['resolved','closed'].includes(c.status)) acc[id].resolved++
      if (c.status === 'in_progress') acc[id].inProgress++
      const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000
      if (hrs > 48 && !['resolved','closed'].includes(c.status)) acc[id].overdue++
      return acc
    }, {})

    const performanceData = Object.values(councilStats).map(m => ({
      name: m.name,
      shortName: m.name.split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' '),
      Score: m.total > 0 ? Math.max(0, Math.round((m.resolved / m.total) * 100 - m.overdue * 10)) : 0,
      Resolved: m.resolved, Active: m.inProgress, Overdue: m.overdue, Total: m.total,
      rate: m.total > 0 ? Math.round((m.resolved / m.total) * 100) : 0,
    })).sort((a, b) => b.Score - a.Score)

    // ── #13 FCR (First Contact Resolution) ────────────────────────────────────
    // Proxy: resolved/closed complaints where handler never left council_member level
    const fcrCount = complaints.filter(c =>
      ['resolved','closed'].includes(c.status) &&
      (c.current_handler_role === 'council_member' || !c.current_handler_role)
    ).length
    const fcrRate = resolved > 0 ? Math.round((fcrCount / resolved) * 100) : 0

    // ── #14 CSAT per Handler ───────────────────────────────────────────────────
    const csatByHandler = {}
    complaints.forEach(c => {
      if (!c.feedback_rating || !c.council_member?.id) return
      const id   = c.council_member.id
      const name = c.council_member.name
      if (!csatByHandler[id]) csatByHandler[id] = { id, name, sum: 0, count: 0 }
      csatByHandler[id].sum   += c.feedback_rating
      csatByHandler[id].count += 1
    })
    const csatData = Object.values(csatByHandler).map(h => ({
      name: h.name, avg: +(h.sum / h.count).toFixed(1), count: h.count,
    })).sort((a, b) => b.avg - a.avg)
    const overallCsat = csatData.length > 0
      ? +(csatData.reduce((s, h) => s + h.avg * h.count, 0) / csatData.reduce((s, h) => s + h.count, 0)).toFixed(1)
      : null

    // ── #15 SLA Breach Rate ────────────────────────────────────────────────────
    const now2 = Date.now()
    const slaThreshMs = SLA_HRS * 3600000
    const slaBreached  = complaints.filter(c => {
      if (['resolved','closed'].includes(c.status)) {
        // resolved but took longer than SLA
        return (new Date(c.updated_at) - new Date(c.created_at)) > slaThreshMs
      }
      return (now2 - new Date(c.created_at).getTime()) > slaThreshMs
    }).length
    const slaBreachRate = total > 0 ? Math.round((slaBreached / total) * 100) : 0

    // ── #16 Domain Heatmap — complaints per domain per day (last 14 days) ─────
    const domainKeys = Object.keys(DOMAINS)
    const heatmapDays = 14
    const heatmapData = Array.from({ length: heatmapDays }, (_, i) => {
      const day   = new Date(now2 - (heatmapDays - 1 - i) * 86400000)
      const label = day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
      const end   = start + 86400000
      const row   = { name: label }
      domainKeys.forEach(dk => {
        row[dk] = complaints.filter(c => {
          const t = new Date(c.created_at).getTime()
          return t >= start && t < end && c.domain === dk
        }).length
      })
      return row
    })
    const heatmapMax = Math.max(1, ...heatmapData.flatMap(r => domainKeys.map(dk => r[dk])))

    // ── #17 Escalation Rate per Handler ───────────────────────────────────────
    const escalationStatuses = [
      'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
    ]
    const escByHandler = {}
    complaints.forEach(c => {
      if (!c.council_member?.id) return
      const id   = c.council_member.id
      const name = c.council_member.name
      if (!escByHandler[id]) escByHandler[id] = { id, name, total: 0, escalated: 0 }
      escByHandler[id].total++
      if (escalationStatuses.includes(c.status)) escByHandler[id].escalated++
    })
    const escalationData = Object.values(escByHandler)
      .filter(h => h.total >= 2)
      .map(h => ({
        name: h.name,
        shortName: h.name.split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' '),
        rate: Math.round((h.escalated / h.total) * 100),
        escalated: h.escalated,
        total: h.total,
      })).sort((a, b) => b.rate - a.rate)

    // ── #18 Response Time Distribution ────────────────────────────────────────
    // Bucket resolved complaints by resolution time
    const buckets = [
      { label: '<6h',    min: 0,    max: 6 },
      { label: '6–24h',  min: 6,    max: 24 },
      { label: '1–3d',   min: 24,   max: 72 },
      { label: '3–7d',   min: 72,   max: 168 },
      { label: '1–2w',   min: 168,  max: 336 },
      { label: '>2w',    min: 336,  max: Infinity },
    ]
    const responseDistData = buckets.map(b => ({
      name: b.label,
      count: resolvedComplaints.filter(c => {
        const hrs = (new Date(c.updated_at) - new Date(c.created_at)) / 3600000
        return hrs >= b.min && hrs < b.max
      }).length,
    }))

    return {
      total, resolved, pending, urgent, resolutionRate, avgResolutionHrs,
      domainData, statusData, timelineData, sectionData, performanceData,
      // new metrics
      fcrCount, fcrRate, csatData, overallCsat,
      slaBreached, slaBreachRate,
      heatmapData, heatmapMax,
      escalationData,
      responseDistData,
    }
  }, [complaints])

  const {
    total, resolved, pending, urgent, resolutionRate, avgResolutionHrs,
    domainData, statusData, timelineData, sectionData, performanceData,
    fcrCount, fcrRate, csatData, overallCsat,
    slaBreached, slaBreachRate,
    heatmapData, heatmapMax,
    escalationData,
    responseDistData,
  } = analytics

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows  = [
      ['Vox DPSI — Analytics Export', today],
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['Total Complaints', total],
      ['Resolved', resolved],
      ['Pending', pending],
      ['Urgent', urgent],
      ['Resolution Rate (%)', resolutionRate],
      ['Avg Resolution Time (hrs)', avgResolutionHrs],
      ['FCR Count', fcrCount],
      ['FCR Rate (%)', fcrRate],
      ['SLA Breaches', slaBreached],
      ['SLA Breach Rate (%)', slaBreachRate],
      ['Overall CSAT', overallCsat ?? 'N/A'],
      [],
      ['BY DOMAIN'],
      ['Domain', 'Count'],
      ...domainData.map(d => [d.name, d.value]),
      [],
      ['BY STATUS'],
      ['Status', 'Count'],
      ...statusData.map(s => [s.name, s.value]),
      [],
      ['RESPONSE TIME DISTRIBUTION'],
      ['Bucket', 'Complaints'],
      ...responseDistData.map(b => [b.name, b.count]),
      [],
      ['ESCALATION RATE PER HANDLER'],
      ['Handler', 'Total', 'Escalated', 'Rate (%)'],
      ...escalationData.map(h => [h.name, h.total, h.escalated, h.rate]),
      [],
      ['CSAT PER HANDLER'],
      ['Handler', 'Avg Rating', 'Ratings Count'],
      ...csatData.map(h => [h.name, h.avg, h.count]),
    ]
    downloadCSV(`vox-dpsi-analytics-${today}.csv`, rows)
  }

  // ─── Print analytics report ─────────────────────────────────────────────────
  const printAnalytics = () => {
    const today = new Date().toLocaleString('en-IN', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const table = (headers, rows) => `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Analytics Report — Vox DPSI</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Georgia,serif; color:#1a1a1a; background:#fff; padding:32px; max-width:960px; margin:0 auto; }
  .header { border-bottom:3px solid #003366; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; }
  h1 { font-size:22px; color:#003366; }
  h2 { font-size:14px; font-weight:bold; color:#003366; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1.5px solid #d1d9e6; padding-bottom:5px; margin-bottom:12px; margin-top:24px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .kpi { background:#f7f8fa; border:1px solid #d1d9e6; border-radius:6px; padding:10px 12px; text-align:center; }
  .kpi .v { font-size:20px; font-weight:bold; color:#003366; }
  .kpi .l { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:4px; }
  thead th { background:#003366; color:#fff; padding:6px 10px; text-align:left; font-size:11px; }
  tbody tr:nth-child(even) { background:#f5f7fa; }
  tbody td { padding:5px 10px; border-bottom:1px solid #e8edf5; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .footer { margin-top:32px; padding-top:10px; border-top:2px solid #003366; font-size:9.5px; color:#888; display:flex; justify-content:space-between; }
  @media print { .print-btn { display:none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Vox DPSI — Analytics Report</h1>
      <p style="font-size:11px;color:#888;margin-top:4px">Delhi Public School Indore · Student Grievance Management System</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#888">
      <p>Generated: ${today}</p>
      <p>Total complaints: ${total}</p>
    </div>
  </div>

  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="v">${total}</div><div class="l">Total Raised</div></div>
    <div class="kpi"><div class="v">${resolved} (${resolutionRate}%)</div><div class="l">Resolved</div></div>
    <div class="kpi"><div class="v">${pending}</div><div class="l">Pending</div></div>
    <div class="kpi"><div class="v">${urgent}</div><div class="l">Urgent</div></div>
    <div class="kpi"><div class="v">${avgResolutionHrs > 0 ? avgResolutionHrs + 'h' : 'N/A'}</div><div class="l">Avg Resolution</div></div>
    <div class="kpi"><div class="v">${fcrRate}%</div><div class="l">FCR Rate</div></div>
    <div class="kpi"><div class="v">${slaBreachRate}%</div><div class="l">SLA Breach Rate</div></div>
    <div class="kpi"><div class="v">${overallCsat ? overallCsat + '★' : 'N/A'}</div><div class="l">Avg CSAT</div></div>
  </div>

  <div class="two-col">
    <div>
      <h2>By Domain</h2>
      ${table(['Domain', 'Count'], domainData.map(d => [d.name, d.value]))}
    </div>
    <div>
      <h2>By Status</h2>
      ${table(['Status', 'Count'], statusData.map(s => [s.name, s.value]))}
    </div>
  </div>

  <h2>Response Time Distribution</h2>
  ${table(['Time Bucket', 'Complaints'], responseDistData.map(b => [b.name, b.count]))}

  ${escalationData.length > 0 ? `
  <h2>Escalation Rate per Handler</h2>
  ${table(['Handler', 'Total', 'Escalated', 'Rate'], escalationData.map(h => [h.name, h.total, h.escalated, h.rate + '%']))}
  ` : ''}

  ${csatData.length > 0 ? `
  <h2>CSAT per Handler</h2>
  ${table(['Handler', 'Avg Rating', '# Ratings'], csatData.map(h => [h.name, h.avg + '★', h.count]))}
  ` : ''}

  <div class="footer">
    <span>Vox DPSI Analytics Report · Delhi Public School Indore</span>
    <span>Generated ${today}</span>
  </div>

  <div class="print-btn" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 32px;background:#003366;color:#FFD700;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;font-family:Georgia,serif;margin-right:10px">🖨️ Print / Save PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">✕ Close</button>
  </div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=980,height=820')
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  return (
    <div className="space-y-6">
      {/* ── #19 Export toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: '#2d5c26' }}>Analytics Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">{total} complaint{total !== 1 ? 's' : ''} in dataset</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(45,92,38,0.08)', border: '1px solid rgba(45,92,38,0.18)', color: '#2d5c26' }}
          >
            ⬇️ Export CSV
          </button>
          <button
            onClick={printAnalytics}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#2d5c26', color: '#c9a84c' }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* KPI strip — includes FCR, CSAT, SLA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total Raised"   value={total}    color="#2d5c26" />
        <StatCard label="Resolved"       value={resolved} color="#16A34A" sub={`${resolutionRate}%`} />
        <StatCard label="Pending"        value={pending}  color="#D97706" />
        <StatCard label="Urgent"         value={urgent}   color="#DC2626" />
        <StatCard label="Avg Resolution" value={avgResolutionHrs > 0 ? `${avgResolutionHrs}h` : 'N/A'} color="#4F46E5" />
        {/* #13 FCR */}
        <StatCard label="FCR Rate"       value={`${fcrRate}%`}  color="#0891B2" sub={`${fcrCount} complaints`} />
        {/* #15 SLA Breach */}
        <StatCard label="SLA Breaches"   value={slaBreached}    color={slaBreachRate > 30 ? '#DC2626' : '#D97706'} sub={`${slaBreachRate}% of total`} />
        {/* #14 Avg CSAT */}
        <StatCard label="Avg CSAT"       value={overallCsat ? `${overallCsat}★` : 'N/A'} color="#F59E0B" sub={overallCsat ? 'out of 5' : 'no ratings yet'} />
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

      {/* Council Member Performance — hidden for coordinator */}
      {showCouncilPerformance && performanceData.length > 0 ? (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Council Member Performance</h3>
          </div>
          <p className="text-xs text-gray-400 mb-5">Performance score = resolution rate − (overdue penalty × 10). Higher is better.</p>

          {/* Bar chart */}
          <div className="mb-5">
            <ResponsiveContainer width="100%" height={performanceData.length * 52 + 20}>
              <BarChart data={performanceData} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => `${v}`} />
                <YAxis type="category" dataKey="shortName" width={100} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ background: '#fff', border: '1px solid rgba(45,92,38,0.15)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                      <p style={{ fontWeight: '700', color: '#2d5c26', fontSize: '13px', marginBottom: '6px' }}>{d?.name}</p>
                      <p style={{ fontSize: '12px', color: '#374151' }}>Score: <strong style={{ color: d?.Score >= 70 ? '#16A34A' : d?.Score >= 40 ? '#D97706' : '#DC2626' }}>{d?.Score}</strong></p>
                      <p style={{ fontSize: '12px', color: '#374151' }}>Resolved: <strong>{d?.Resolved}/{d?.Total}</strong> ({d?.rate}%)</p>
                      {d?.Active > 0 && <p style={{ fontSize: '12px', color: '#374151' }}>Active: <strong>{d?.Active}</strong></p>}
                      {d?.Overdue > 0 && <p style={{ fontSize: '12px', color: '#DC2626' }}>Overdue: <strong>{d?.Overdue}</strong></p>}
                    </div>
                  )
                }} />
                <Bar dataKey="Score" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {performanceData.map((m, i) => (
                    <Cell key={i} fill={m.Score >= 70 ? '#16A34A' : m.Score >= 40 ? '#D97706' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {performanceData.map(m => (
              <div key={m.name} className="rounded-xl px-4 py-3" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.1)' }}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <span className="font-bold text-sm leading-tight" style={{ color: '#2d5c26' }}>{m.name}</span>
                  <span className="text-xl font-black flex-shrink-0" style={{ color: m.Score >= 70 ? '#16A34A' : m.Score >= 40 ? '#D97706' : '#DC2626' }}>
                    {m.Score}
                  </span>
                </div>
                <div className="w-full rounded-full h-2 mb-2" style={{ background: '#E5E7EB' }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(m.Score, 100)}%`, background: m.Score >= 70 ? '#16A34A' : m.Score >= 40 ? '#D97706' : '#DC2626' }} />
                </div>
                <div className="flex gap-3 text-xs">
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>{m.Resolved} resolved</span>
                  {m.Active > 0 && <span style={{ color: '#4F46E5', fontWeight: 600 }}>{m.Active} active</span>}
                  {m.Overdue > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>{m.Overdue} overdue</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">{m.Total} total · {m.rate}% resolution rate</p>
              </div>
            ))}
          </div>
        </div>
      ) : showCouncilPerformance ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-bold text-gray-600 mb-1">Council Performance</p>
          <p className="text-sm text-gray-400">Performance data will appear once complaints are assigned to council members.</p>
        </div>
      ) : null}

      {/* ── Row: #17 Escalation Rate + #18 Response Time Distribution ─────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* #17 Escalation Rate per Handler */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-1 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Escalation Rate per Handler</h3>
          <p className="text-xs text-gray-400 mb-4">% of assigned complaints escalated beyond council level</p>
          {escalationData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet (need ≥2 complaints per handler)</p>
          ) : (
            <div className="space-y-3">
              {escalationData.map(h => (
                <div key={h.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{h.shortName}</span>
                    <span className="text-sm font-black" style={{ color: h.rate > 50 ? '#DC2626' : h.rate > 25 ? '#D97706' : '#16A34A' }}>
                      {h.rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${h.rate}%`, background: h.rate > 50 ? '#DC2626' : h.rate > 25 ? '#D97706' : '#16A34A' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{h.escalated} of {h.total} complaints</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* #18 Response Time Distribution */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-1 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Response Time Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Time from filing to resolution (resolved complaints only)</p>
          {resolved === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No resolved complaints yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={responseDistData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
                  {responseDistData.map((entry, i) => (
                    <Cell key={i} fill={i <= 1 ? '#16A34A' : i <= 2 ? '#D97706' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── #14 CSAT per Handler ─────────────────────────────────────────────── */}
      {csatData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-1 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>CSAT — Student Satisfaction per Handler</h3>
          <p className="text-xs text-gray-400 mb-4">Average star rating (1–5) given by students on resolved complaints</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {csatData.map(h => (
              <div key={h.name} className="rounded-xl px-4 py-3 text-center"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-2xl font-black" style={{ color: h.avg >= 4 ? '#16A34A' : h.avg >= 3 ? '#D97706' : '#DC2626' }}>
                  {h.avg}★
                </p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{h.name.split(' ')[0]}</p>
                <p className="text-xs text-gray-400">{h.count} rating{h.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── #16 Domain Heatmap ───────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold mb-1 text-sm uppercase tracking-wide" style={{ color: '#2d5c26' }}>Domain Activity Heatmap — Last 14 Days</h3>
        <p className="text-xs text-gray-400 mb-4">Complaints filed per domain per day. Darker = more complaints.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 8px', fontSize: '11px', color: '#6B7280', textAlign: 'left', fontWeight: 600 }}>Domain</th>
                {heatmapData.map(d => (
                  <th key={d.name} style={{ padding: '4px 4px', fontSize: '10px', color: '#9CA3AF', fontWeight: 500, textAlign: 'center', minWidth: '36px' }}>
                    {d.name.split(' ')[0]}
                  </th>
                ))}
                <th style={{ padding: '4px 8px', fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DOMAINS).map(([dk, dv]) => {
                const rowTotal = heatmapData.reduce((s, d) => s + (d[dk] || 0), 0)
                return (
                  <tr key={dk}>
                    <td style={{ padding: '3px 8px', fontSize: '12px', color: dv.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {dv.icon} {dv.label}
                    </td>
                    {heatmapData.map(d => {
                      const val = d[dk] || 0
                      const intensity = Math.min(1, val / heatmapMax)
                      const alpha = intensity < 0.05 ? 0.05 : intensity
                      return (
                        <td key={d.name}
                          title={`${dv.label} on ${d.name}: ${val}`}
                          style={{
                            padding: '3px 2px',
                            textAlign: 'center',
                          }}>
                          <div style={{
                            width: '28px', height: '24px', borderRadius: '4px',
                            background: val === 0 ? 'rgba(0,0,0,0.03)' : `${dv.color}`,
                            opacity: val === 0 ? 1 : Math.max(0.15, alpha),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700,
                            color: val === 0 ? '#D1D5DB' : val > 0 ? '#fff' : 'transparent',
                            margin: '0 auto',
                          }}>
                            {val > 0 ? val : ''}
                          </div>
                        </td>
                      )
                    })}
                    <td style={{ padding: '3px 8px', fontSize: '12px', fontWeight: 700, color: rowTotal > 0 ? '#2d5c26' : '#9CA3AF', textAlign: 'center' }}>
                      {rowTotal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
