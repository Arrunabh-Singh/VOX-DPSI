import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { COLORS } from '../utils/constants'

export default function AssignmentRulesPanel() {
  const { user } = useAuth()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [councilMembers, setCouncilMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    condition_type: 'domain',
    condition_value: '',
    assign_to_id: '',
    priority: 10
  })

  useEffect(() => {
    fetchRules()
    fetchCouncilMembers()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/config/assignment-rules')
      setRules(data.rules || [])
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCouncilMembers = async () => {
    try {
      const { data } = await api.get('/api/users?role=council_member')
      setCouncilMembers(data || [])
    } catch {}
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.condition_value || !formData.assign_to_id) {
      toast.error('All fields are required')
      return
    }
    try {
      await api.post('/api/config/assignment-rules', formData)
      toast.success('Rule added successfully')
      setShowForm(false)
      setFormData({ name: '', condition_type: 'domain', condition_value: '', assign_to_id: '', priority: 10 })
      fetchRules()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add rule')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this rule?')) return
    try {
      await api.delete(`/api/config/assignment-rules/${id}`)
      toast.success('Rule deleted')
      fetchRules()
    } catch (err) {
      toast.error('Failed to delete rule')
    }
  }

  const getConditionLabel = (rule) => {
    const typeLabels = { domain: 'Domain', section: 'Section', house: 'House' }
    return `${typeLabels[rule.condition_type] || 'Condition'}: ${rule.condition_value}`
  }

  const getAssignedToName = (assign_to_id) => {
    const member = councilMembers.find(m => m.id === assign_to_id)
    return member?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-center text-gray-500">Loading rules...</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg" style={{ color: COLORS.nav }}>Assignment Rules</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: showForm ? '#EF4444' : COLORS.nav, color: '#fff', border: 'none' }}
        >
          {showForm ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(45,92,38,0.04)', border: '1px solid rgba(45,92,38,0.1)' }}>
          <div className="grid gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Rule Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Academics to Arjun"
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                style={{ borderColor: 'rgba(45,92,38,0.2)', background: '#fff' }}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Condition Type</label>
                <select
                  value={formData.condition_type}
                  onChange={e => setFormData({ ...formData, condition_type: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm border"
                  style={{ borderColor: 'rgba(45,92,38,0.2)', background: '#fff' }}
                >
                  <option value="domain">Domain</option>
                  <option value="section">Section</option>
                  <option value="house">House</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Condition Value</label>
                <input
                  value={formData.condition_value}
                  onChange={e => setFormData({ ...formData, condition_value: e.target.value })}
                  placeholder="e.g. academics"
                  className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                  style={{ borderColor: 'rgba(45,92,38,0.2)', background: '#fff' }}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Assign To</label>
              <select
                value={formData.assign_to_id}
                onChange={e => setFormData({ ...formData, assign_to_id: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ borderColor: 'rgba(45,92,38,0.2)', background: '#fff' }}
                required
              >
                <option value="">Select council member</option>
                {councilMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Priority (lower = higher priority)</label>
              <input
                type="number"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                min="1"
                max="100"
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                style={{ borderColor: 'rgba(45,92,38,0.2)', background: '#fff' }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg font-semibold text-sm"
              style={{ background: COLORS.nav, color: COLORS.gold, border: 'none' }}
            >
              Save Rule
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No assignment rules configured.</p>
          <p className="text-xs mt-2">Rules help route complaints automatically based on domain, section, or house.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(45,92,38,0.08)' }}>
              <div>
                <p className="font-semibold text-sm">{rule.name}</p>
                <p className="text-xs text-gray-500">{getConditionLabel(rule)} → {getAssignedToName(rule.assign_to_id)}</p>
                <p className="text-xs text-gray-400">Priority: {rule.priority}</p>
              </div>
              <button
                onClick={() => handleDelete(rule.id)}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}