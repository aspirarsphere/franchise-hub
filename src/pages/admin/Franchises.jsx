import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import { Store, Plus, Power, ChevronLeft, MapPin, Users, TrendingUp, Check, Pencil, Trash2, X } from 'lucide-react'
import { formatINR, todayIST } from '../../lib/utils'

// ─── Franchise List ───────────────────────────────────────────────────────────
export default function Franchises() {
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', owner_phone: '', address: '', franchise_code: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadFranchises() }, [])

  async function loadFranchises() {
    const { data } = await supabase
      .from('franchises')
      .select('*, profiles!profiles_franchise_id_fkey(count), sales(total)')
      .order('name')
    setFranchises(data || [])
    setLoading(false)
  }

  async function addFranchise() {
    if (!form.name.trim() || !form.franchise_code.trim()) { alert('Name and franchise code are required.'); return }
    setAddLoading(true)
    const { error } = await supabase.from('franchises').insert({
      name: form.name.trim(),
      address: form.address.trim() || null,
      franchise_code: form.franchise_code.trim().toUpperCase(),
      is_active: true
    })
    setAddLoading(false)
    if (error) { alert('Could not create franchise. Please try again.'); return }
    setAdding(false)
    setForm({ name: '', owner_phone: '', address: '', franchise_code: '' })
    loadFranchises()
  }

  if (selected) {
    return <FranchiseDetail franchise={selected} onBack={() => { setSelected(null); loadFranchises() }} />
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-2xl font-semibold text-gray-800">Franchises</h2>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-white text-xs font-body font-semibold"
          style={{ backgroundColor: '#700000' }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 fade-in">
          <p className="text-sm font-semibold font-body text-gray-700 mb-3">New Franchise</p>
          {[
            { key: 'name', placeholder: 'Outlet name *' },
            { key: 'franchise_code', placeholder: 'Franchise code (e.g. CHN01) *' },
            { key: 'address', placeholder: 'Address' },
            { key: 'owner_phone', placeholder: 'Owner phone (10 digits)' },
          ].map(({ key, placeholder }) => (
            <input key={key} value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-maroon mb-2"
            />
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={() => setAdding(false)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
            <button onClick={addFranchise} disabled={addLoading}
              className="flex-1 h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
              style={{ backgroundColor: '#700000' }}>
              {addLoading ? <Spinner size={18} /> : 'Create'}
            </button>
          </div>
        </div>
      )}

      {franchises.length === 0 ? (
        <EmptyState icon={Store} title="No franchises yet" message="Add your first franchise outlet to get started." />
      ) : (
        <div className="space-y-3">
          {franchises.map(f => {
            const totalRevenue = f.sales?.reduce((s, r) => s + (r.total || 0), 0) || 0
            return (
              <button key={f.id} onClick={() => setSelected(f)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.99] ${f.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-body font-bold text-gray-800">{f.name}</p>
                      <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{f.franchise_code}</span>
                    </div>
                    {f.address && <p className="text-xs text-gray-400 font-body mt-0.5">{f.address}</p>}
                  </div>
                  <ChevronLeft size={16} className="text-gray-300 rotate-180 mt-0.5" />
                </div>
                <div className="flex gap-4 text-xs font-body text-gray-400">
                  <span>All-time: <strong className="text-gray-700">{formatINR(totalRevenue)}</strong></span>
                  <span className={`font-semibold ${f.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Franchise Detail ─────────────────────────────────────────────────────────
function FranchiseDetail({ franchise, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  // outlet edit
  const [name, setName] = useState(franchise.name || '')
  const [address, setAddress] = useState(franchise.address || '')
  const [dailyTarget, setDailyTarget] = useState(String(franchise.daily_target || '10000'))
  const [savingOutlet, setSavingOutlet] = useState(false)
  const [savedOutlet, setSavedOutlet] = useState(false)

  // location state
  const [editingRadius, setEditingRadius] = useState({}) // locId → value
  const [savingRadius, setSavingRadius] = useState({})
  const [showAddLoc, setShowAddLoc] = useState(false)
  const [locForm, setLocForm] = useState({ label: '', lat: '', lng: '', radius_meters: '200' })
  const [addingLoc, setAddingLoc] = useState(false)

  useEffect(() => { loadDetail() }, [])

  async function loadDetail() {
    const today = todayIST()
    const [profilesRes, locsRes, salesTodayRes, attRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, phone').eq('franchise_id', franchise.id).order('role'),
      supabase.from('franchise_locations').select('*').eq('franchise_id', franchise.id).order('created_at'),
      supabase.from('sales').select('total').eq('franchise_id', franchise.id).gte('created_at', today + 'T00:00:00+05:30'),
      supabase.from('attendance').select('user_id, clock_in_time, clock_out_time').eq('franchise_id', franchise.id).eq('date', today),
    ])
    const todayRevenue = (salesTodayRes.data || []).reduce((s, r) => s + (r.total || 0), 0)
    const clockedInIds = new Set((attRes.data || []).filter(a => a.clock_in_time && !a.clock_out_time).map(a => a.user_id))
    setData({
      staff: profilesRes.data || [],
      locations: locsRes.data || [],
      todayRevenue,
      clockedInIds,
    })
    setLoading(false)
  }

  async function toggleActive() {
    await supabase.from('franchises').update({ is_active: !franchise.is_active }).eq('id', franchise.id)
    setConfirm(null)
    onBack()
  }

  async function saveOutlet() {
    setSavingOutlet(true)
    await supabase.from('franchises').update({
      name: name.trim(),
      address: address.trim(),
      daily_target: parseFloat(dailyTarget) || 10000,
    }).eq('id', franchise.id)
    setSavingOutlet(false)
    setSavedOutlet(true)
    setTimeout(() => setSavedOutlet(false), 2000)
  }

  async function saveRadius(loc) {
    const val = parseInt(editingRadius[loc.id])
    if (!val || val < 50) { alert('Minimum radius is 50m.'); return }
    setSavingRadius(p => ({ ...p, [loc.id]: true }))
    await supabase.from('franchise_locations').update({ radius_meters: val }).eq('id', loc.id)
    setSavingRadius(p => ({ ...p, [loc.id]: false }))
    setEditingRadius(p => { const n = { ...p }; delete n[loc.id]; return n })
    loadDetail()
  }

  async function approveLocation(loc) {
    await supabase.from('franchise_locations').update({ status: 'active' }).eq('id', loc.id)
    loadDetail()
  }

  async function rejectLocation(loc) {
    await supabase.from('franchise_locations').update({ status: 'rejected' }).eq('id', loc.id)
    loadDetail()
  }

  async function deleteLocation(loc) {
    await supabase.from('franchise_locations').delete().eq('id', loc.id)
    loadDetail()
  }

  async function addLocation() {
    if (!locForm.lat || !locForm.lng) { alert('Enter latitude and longitude.'); return }
    const lat = parseFloat(locForm.lat), lng = parseFloat(locForm.lng)
    if (isNaN(lat) || isNaN(lng)) { alert('Invalid coordinates.'); return }
    setAddingLoc(true)
    const isPrimary = (data?.locations || []).filter(l => l.status === 'active').length === 0
    await supabase.from('franchise_locations').insert({
      franchise_id: franchise.id,
      label: locForm.label.trim() || 'Location',
      lat, lng,
      radius_meters: parseInt(locForm.radius_meters) || 200,
      is_primary: isPrimary,
      status: 'active', // admin-added locations are auto-approved
    })
    setAddingLoc(false)
    setShowAddLoc(false)
    setLocForm({ label: '', lat: '', lng: '', radius_meters: '200' })
    loadDetail()
  }

  async function useGPS() {
    if (!navigator.geolocation) { alert('GPS not available.'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setLocForm(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => alert('Could not get GPS. Enter manually.'),
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const STATUS_STYLE = { active: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-600' }

  return (
    <div className="px-4 py-5 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-heading text-xl font-semibold text-gray-800">{franchise.name}</h2>
            <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{franchise.franchise_code}</span>
            <span className={`text-[10px] font-semibold font-body px-2 py-0.5 rounded-full ${franchise.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {franchise.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {franchise.address && <p className="text-xs text-gray-400 font-body mt-0.5 truncate">{franchise.address}</p>}
        </div>
        <button onClick={() => setConfirm(true)}
          className={`p-2 rounded-full ${franchise.is_active ? 'hover:bg-red-50' : 'hover:bg-green-50'} transition-colors`}>
          <Power size={16} className={franchise.is_active ? 'text-red-400' : 'text-green-500'} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-5">

          {/* Today stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <TrendingUp size={16} className="mx-auto mb-1" style={{ color: '#9c7738' }} />
              <p className="font-heading text-lg font-bold text-gray-800">{formatINR(data.todayRevenue)}</p>
              <p className="text-[10px] text-gray-400 font-body">Today's Revenue</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Users size={16} className="mx-auto mb-1 text-blue-500 mb-1" />
              <p className="font-heading text-lg font-bold text-gray-800">{data.clockedInIds.size}</p>
              <p className="text-[10px] text-gray-400 font-body">Staff Clocked In</p>
            </div>
          </div>

          {/* Staff */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} style={{ color: '#9c7738' }} />
              <p className="text-sm font-semibold font-body text-gray-700">Staff ({data.staff.length})</p>
            </div>
            {data.staff.length === 0 ? (
              <p className="text-sm text-gray-400 font-body text-center py-3">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {data.staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-body font-medium text-gray-800">{s.full_name || '—'}</p>
                      <p className="text-[11px] text-gray-400 font-body capitalize">{s.role}{s.phone ? ` · ${s.phone}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-semibold font-body px-2 py-0.5 rounded-full ${data.clockedInIds.has(s.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {data.clockedInIds.has(s.id) ? 'In' : 'Out'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <MapPin size={15} style={{ color: '#9c7738' }} />
                <p className="text-sm font-semibold font-body text-gray-700">Locations</p>
              </div>
              <button onClick={() => setShowAddLoc(v => !v)}
                className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-white text-[11px] font-body font-semibold"
                style={{ backgroundColor: '#700000' }}>
                {showAddLoc ? <X size={11} /> : <Plus size={11} />} {showAddLoc ? 'Cancel' : 'Add'}
              </button>
            </div>
            <p className="text-xs text-gray-400 font-body mb-3">Staff must be within the radius to clock in.</p>

            {data.locations.length === 0 && !showAddLoc && (
              <p className="text-sm text-gray-400 font-body text-center py-3">No locations set.</p>
            )}

            <div className="space-y-3">
              {data.locations.map(loc => (
                <div key={loc.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-body font-semibold text-gray-800">{loc.label}</p>
                        {loc.is_primary && <span className="text-[10px] font-body px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">Primary</span>}
                        <span className={`text-[10px] font-semibold font-body px-1.5 py-0.5 rounded-full ${STATUS_STYLE[loc.status] || 'bg-gray-100 text-gray-500'}`}>
                          {loc.status === 'pending' ? 'Pending' : loc.status === 'active' ? 'Active' : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</p>
                    </div>
                    <button onClick={() => deleteLocation(loc)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>

                  {/* Radius edit */}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500 font-body">Radius:</p>
                    {editingRadius[loc.id] !== undefined ? (
                      <>
                        <input
                          type="number"
                          value={editingRadius[loc.id]}
                          onChange={e => setEditingRadius(p => ({ ...p, [loc.id]: e.target.value }))}
                          className="w-20 h-7 text-center border border-gray-300 rounded-lg font-body text-xs focus:outline-none"
                          autoFocus
                        />
                        <span className="text-xs text-gray-400 font-body">m</span>
                        <button onClick={() => saveRadius(loc)} disabled={savingRadius[loc.id]}
                          className="px-2 h-7 rounded-lg text-white text-[11px] font-body font-semibold flex items-center gap-1"
                          style={{ backgroundColor: '#700000' }}>
                          {savingRadius[loc.id] ? <Spinner size={12} /> : <><Check size={11} /> Save</>}
                        </button>
                        <button onClick={() => setEditingRadius(p => { const n = { ...p }; delete n[loc.id]; return n })}
                          className="p-1 text-gray-400">
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-body font-semibold text-gray-700">{loc.radius_meters}m</span>
                        <button onClick={() => setEditingRadius(p => ({ ...p, [loc.id]: String(loc.radius_meters) }))}
                          className="p-1 rounded hover:bg-gray-200 transition-colors">
                          <Pencil size={11} className="text-gray-400" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Approve/Reject for pending */}
                  {loc.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => approveLocation(loc)}
                        className="flex-1 h-8 rounded-lg text-white text-xs font-body font-semibold"
                        style={{ backgroundColor: '#16a34a' }}>Approve</button>
                      <button onClick={() => rejectLocation(loc)}
                        className="flex-1 h-8 rounded-lg text-white text-xs font-body font-semibold bg-red-500">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add location form */}
            {showAddLoc && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 fade-in">
                <input value={locForm.label} onChange={e => setLocForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="Label (e.g. Main Entrance)"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={locForm.lat} onChange={e => setLocForm(p => ({ ...p, lat: e.target.value }))}
                    placeholder="Latitude" type="number" step="any"
                    className="h-10 px-3 border border-gray-200 rounded-xl font-body text-sm font-mono focus:outline-none" />
                  <input value={locForm.lng} onChange={e => setLocForm(p => ({ ...p, lng: e.target.value }))}
                    placeholder="Longitude" type="number" step="any"
                    className="h-10 px-3 border border-gray-200 rounded-xl font-body text-sm font-mono focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <input value={locForm.radius_meters} onChange={e => setLocForm(p => ({ ...p, radius_meters: e.target.value }))}
                    placeholder="Radius (m)" type="number"
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
                  <button onClick={useGPS}
                    className="px-3 h-10 rounded-xl border text-xs font-body font-medium flex items-center gap-1"
                    style={{ borderColor: '#700000', color: '#700000' }}>
                    <MapPin size={12} /> GPS
                  </button>
                </div>
                <button onClick={addLocation} disabled={addingLoc}
                  className="w-full h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
                  style={{ backgroundColor: '#700000' }}>
                  {addingLoc ? <Spinner size={18} /> : 'Add Location'}
                </button>
              </div>
            )}
          </div>

          {/* Outlet settings */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Store size={15} style={{ color: '#9c7738' }} />
              <p className="text-sm font-semibold font-body text-gray-700">Outlet Settings</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Daily Target (₹)</label>
                <input type="number" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>
            </div>
            <button onClick={saveOutlet} disabled={savingOutlet}
              className="w-full h-11 rounded-xl text-white text-sm font-body font-semibold mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: savedOutlet ? '#16a34a' : '#700000' }}>
              {savingOutlet ? <Spinner size={18} /> : savedOutlet ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>

        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={franchise.is_active ? 'Deactivate Franchise' : 'Activate Franchise'}
        message={`${franchise.is_active ? 'Deactivate' : 'Activate'} ${franchise.name}? ${franchise.is_active ? 'Staff will lose access.' : ''}`}
        danger={franchise.is_active}
        onConfirm={toggleActive}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
