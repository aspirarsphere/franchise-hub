import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { Users, Plus, MapPin, Check, X, Clock, Coffee } from 'lucide-react'
import { todayIST, formatTime } from '../../lib/utils'

const STATE_CODES = [
  'AN','AP','AR','AS','BR','CH','CG','DD','DL','DN','GA','GJ','HP','HR','JH','JK','KA','KL',
  'LA','LD','MH','ML','MN','MP','MZ','NL','OD','PB','PY','RJ','SK','TN','TR','TS','UK','UP','WB'
]

export default function HQTeam() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('live') // live | owners | locations
  const [liveStaff, setLiveStaff] = useState([])
  const [owners, setOwners] = useState([])
  const [franchises, setFranchises] = useState([])
  const [locationRequests, setLocationRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddOwner, setShowAddOwner] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', state_code: 'KL', franchise_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)

  const today = todayIST()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [liveRes, ownersRes, franchisesRes, locReqRes] = await Promise.all([
      supabase.from('profiles')
        .select('*, franchises(name), attendance!inner(clock_in_time, clock_out_time, sessions, date)')
        .eq('role', 'staff')
        .eq('attendance.date', today),
      supabase.from('profiles')
        .select('*, franchises(name, franchise_code)')
        .eq('role', 'franchise_owner'),
      supabase.from('franchises').select('*').eq('is_active', true).order('franchise_code'),
      supabase.from('franchise_locations')
        .select('*, franchises(name), profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    ])
    setLiveStaff(liveRes.data || [])
    setOwners(ownersRes.data || [])
    setFranchises(franchisesRes.data || [])
    setLocationRequests(locReqRes.data || [])
    setLoading(false)
  }

  function generateFranchiseCode(stateCode, existingFranchiseId) {
    const stateFranchises = franchises.filter(f => f.franchise_code?.startsWith(stateCode))
    const next = String(stateFranchises.length + 1).padStart(2, '0')
    return `${stateCode}${next}`
  }

  async function createOwner() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password || !form.franchise_id) {
      alert('Please fill all fields and select a franchise.')
      return
    }
    setSubmitting(true)

    // Create auth user via SQL approach
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'franchise_owner')
      .eq('franchise_id', form.franchise_id)
      .maybeSingle()

    if (existingUser) {
      alert('This franchise already has an owner.')
      setSubmitting(false)
      return
    }

    // Insert invite record for reference
    const { error: inviteErr } = await supabase.from('invites').insert({
      email: form.email.trim(),
      role: 'franchise_owner',
      franchise_id: form.franchise_id,
      full_name: form.full_name.trim(),
      temp_password: form.password,
      invited_by: profile.id,
      status: 'pending'
    })

    setSubmitting(false)
    if (inviteErr) { alert('Error: ' + inviteErr.message); return }

    setCreated({
      name: form.full_name,
      email: form.email,
      password: form.password,
      franchise: franchises.find(f => f.id === form.franchise_id)?.name
    })
    setShowAddOwner(false)
    setForm({ full_name: '', email: '', password: '', state_code: 'KL', franchise_id: '' })
    loadAll()
  }

  async function approveLocation(loc) {
    await supabase.from('franchise_locations')
      .update({ status: 'active' })
      .eq('id', loc.id)
    loadAll()
  }

  async function rejectLocation(loc) {
    await supabase.from('franchise_locations')
      .update({ status: 'rejected' })
      .eq('id', loc.id)
    loadAll()
  }

  function getStaffStatus(s) {
    const att = s.attendance?.[0]
    if (!att?.clock_in_time) return { label: 'Absent', color: 'bg-red-100 text-red-600', dot: 'bg-red-400' }
    if (att.clock_out_time) return { label: 'Left', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' }
    const sessions = att.sessions || []
    const hasOpen = sessions.some(s => s.in && !s.out)
    if (!hasOpen) return { label: 'On Break', color: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400', icon: Coffee }
    return { label: 'Working', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
  }

  // Group live staff by franchise
  const byFranchise = {}
  liveStaff.forEach(s => {
    const fname = s.franchises?.name || 'Unknown'
    if (!byFranchise[fname]) byFranchise[fname] = []
    byFranchise[fname].push(s)
  })

  return (
    <div className="px-4 py-5 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-4">Team</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[['live', 'Live View'], ['owners', 'Owners'], ['locations', `Locations${locationRequests.length > 0 ? ` (${locationRequests.length})` : ''}`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 h-8 rounded-lg text-xs font-body font-semibold transition-all ${tab === key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <>
          {/* LIVE VIEW */}
          {tab === 'live' && (
            <div className="space-y-5 fade-in">
              {Object.keys(byFranchise).length === 0 ? (
                <EmptyState icon={Users} title="No staff clocked in" message="Staff attendance will appear here in real time." />
              ) : (
                Object.entries(byFranchise).map(([fname, staffList]) => (
                  <div key={fname}>
                    <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-2">{fname}</p>
                    <div className="space-y-2">
                      {staffList.map(s => {
                        const status = getStaffStatus(s)
                        const att = s.attendance?.[0]
                        return (
                          <div key={s.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold font-body" style={{ backgroundColor: '#700000' }}>
                                  {s.full_name?.charAt(0) || '?'}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${status.dot}`} />
                              </div>
                              <div>
                                <p className="text-sm font-body font-semibold text-gray-800">{s.full_name}</p>
                                <p className="text-xs text-gray-400 font-body">
                                  {att?.clock_in_time ? `In: ${formatTime(att.clock_in_time)}` : 'Not checked in'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold font-body px-2.5 py-1 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* OWNERS */}
          {tab === 'owners' && (
            <div className="fade-in">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddOwner(true)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-white text-xs font-body font-semibold"
                  style={{ backgroundColor: '#700000' }}>
                  <Plus size={13} /> Add Owner
                </button>
              </div>

              {/* Created credentials card */}
              {created && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 fade-in">
                  <p className="text-sm font-semibold text-green-700 font-body mb-2">✓ Owner invite created — share these credentials:</p>
                  <div className="space-y-1 text-sm font-body text-gray-700">
                    <p><span className="text-gray-500">Name:</span> {created.name}</p>
                    <p><span className="text-gray-500">Franchise:</span> {created.franchise}</p>
                    <p><span className="text-gray-500">Email:</span> {created.email}</p>
                    <p><span className="text-gray-500">Password:</span> <span className="font-mono font-bold">{created.password}</span></p>
                  </div>
                  <p className="text-xs text-gray-400 font-body mt-2">Ask them to create their account in Supabase with these credentials.</p>
                  <button onClick={() => setCreated(null)} className="text-xs text-green-600 font-body mt-1 underline">Dismiss</button>
                </div>
              )}

              {owners.length === 0 ? (
                <EmptyState icon={Users} title="No owners yet" message="Add franchise owners so they can manage their outlets." />
              ) : (
                <div className="space-y-2">
                  {owners.map(o => (
                    <div key={o.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: '#9c7738' }}>
                            {o.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-body font-semibold text-gray-800">{o.full_name}</p>
                            <p className="text-xs text-gray-400 font-body">{o.franchises?.name || 'No franchise'}</p>
                          </div>
                        </div>
                        {o.franchises?.franchise_code && (
                          <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                            {o.franchises.franchise_code}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOCATION REQUESTS */}
          {tab === 'locations' && (
            <div className="fade-in">
              {locationRequests.length === 0 ? (
                <EmptyState icon={MapPin} title="No pending requests" message="Location addition requests from franchise owners will appear here." />
              ) : (
                <div className="space-y-3">
                  {locationRequests.map(loc => (
                    <div key={loc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-body font-bold text-gray-800">{loc.franchises?.name}</p>
                          <p className="text-xs text-gray-500 font-body mt-0.5">{loc.label}</p>
                          <p className="text-xs font-mono text-gray-400 font-body mt-1">
                            {loc.lat?.toFixed(6)}, {loc.lng?.toFixed(6)}
                          </p>
                          <p className="text-xs text-gray-400 font-body">Radius: {loc.radius_meters}m · Requested by: {loc.profiles?.full_name}</p>
                        </div>
                        <span className="text-[10px] font-semibold font-body px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => rejectLocation(loc)}
                          className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-body text-gray-600 flex items-center justify-center gap-1">
                          <X size={14} /> Reject
                        </button>
                        <button onClick={() => approveLocation(loc)}
                          className="flex-1 h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center gap-1"
                          style={{ backgroundColor: '#700000' }}>
                          <Check size={14} /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Owner Modal */}
      {showAddOwner && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowAddOwner(false)}>
          <div className="bg-white rounded-t-3xl w-full p-6 fade-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-semibold text-gray-800 mb-4">Add Franchise Owner</h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Owner's full name"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="owner@email.com"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Temporary Password *</label>
                <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Set a temporary password"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none font-mono" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Franchise *</label>
                <select value={form.franchise_id} onChange={e => setForm(p => ({ ...p, franchise_id: e.target.value }))}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none bg-white">
                  <option value="">Select franchise</option>
                  {franchises.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.franchise_code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 font-body">
                After saving, go to <strong>Supabase → Authentication → Users → Add User</strong> and create the account with these credentials. Then the owner can login immediately.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddOwner(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
              <button onClick={createOwner} disabled={submitting}
                className="flex-1 h-12 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}>
                {submitting ? <Spinner size={18} /> : 'Save Owner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
