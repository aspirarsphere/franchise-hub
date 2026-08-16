import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import { Store, Target, Package, MapPin, Plus, Trash2, Check } from 'lucide-react'
import { formatINR } from '../../lib/utils'

export default function OwnerSettings() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [dailyTarget, setDailyTarget] = useState('')

  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [thresholds, setThresholds] = useState({})

  const [locations, setLocations] = useState([])
  const [showAddLoc, setShowAddLoc] = useState(false)
  const [locForm, setLocForm] = useState({ label: '', lat: '', lng: '', radius_meters: '200' })
  const [addingLoc, setAddingLoc] = useState(false)

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadData()
  }, [profile])

  async function loadData() {
    const [franchiseRes, prodRes, invRes, locRes] = await Promise.all([
      supabase.from('franchises').select('*').eq('id', profile.franchise_id).single(),
      supabase.from('products').select('*').order('line'),
      supabase.from('inventory').select('*').eq('franchise_id', profile.franchise_id),
      supabase.from('franchise_locations').select('*').eq('franchise_id', profile.franchise_id).order('created_at')
    ])
    if (franchiseRes.data) {
      setName(franchiseRes.data.name || '')
      setAddress(franchiseRes.data.address || '')
      setDailyTarget(String(franchiseRes.data.daily_target || '10000'))
    }
    setProducts(prodRes.data || [])
    setInventory(invRes.data || [])
    const tMap = {}
    ;(invRes.data || []).forEach(i => { tMap[i.product_id] = String(i.low_threshold || 5) })
    setThresholds(tMap)
    setLocations(locRes.data || [])
    setLoading(false)
  }

  async function saveOutlet() {
    setSaving(true)
    const { error } = await supabase.from('franchises').update({
      name: name.trim(),
      address: address.trim(),
      daily_target: parseFloat(dailyTarget) || 10000
    }).eq('id', profile.franchise_id)
    setSaving(false)
    if (error) { alert('Could not save: ' + error.message); return }
    setSaved('outlet')
    setTimeout(() => setSaved(''), 2000)
  }

  async function saveThreshold(productId, value) {
    const qty = parseInt(value) || 5
    const inv = inventory.find(i => i.product_id === productId)
    if (inv) {
      await supabase.from('inventory').update({ low_threshold: qty }).eq('id', inv.id)
    } else {
      await supabase.from('inventory').insert({
        franchise_id: profile.franchise_id,
        product_id: productId,
        current_stock: 0,
        opening_stock: 0,
        low_threshold: qty
      })
    }
    setSaved('threshold_' + productId)
    setTimeout(() => setSaved(''), 1500)
  }

  async function addLocation() {
    if (!locForm.lat || !locForm.lng) { alert('Please enter latitude and longitude.'); return }
    const lat = parseFloat(locForm.lat)
    const lng = parseFloat(locForm.lng)
    if (isNaN(lat) || isNaN(lng)) { alert('Invalid coordinates.'); return }

    setAddingLoc(true)
    const isPrimary = locations.filter(l => l.status === 'active').length === 0
    const status = isPrimary ? 'active' : 'pending' // first location is auto-approved, rest need HQ approval

    const { error } = await supabase.from('franchise_locations').insert({
      franchise_id: profile.franchise_id,
      label: locForm.label.trim() || 'Location',
      lat,
      lng,
      radius_meters: parseInt(locForm.radius_meters) || 200,
      is_primary: isPrimary,
      status,
      requested_by: profile.id
    })

    setAddingLoc(false)
    if (error) { alert('Error: ' + error.message); return }
    setShowAddLoc(false)
    setLocForm({ label: '', lat: '', lng: '', radius_meters: '200' })
    loadData()
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) { alert('GPS not available.'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setLocForm(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => alert('Could not get location. Please enter manually.'),
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const STATUS_STYLES = {
    active:   'bg-green-100 text-green-700',
    pending:  'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-600',
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-5 fade-in space-y-6">
      <h2 className="font-heading text-2xl font-semibold text-gray-800">Settings</h2>

      {/* Outlet details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Store size={16} style={{ color: '#9c7738' }} />
          <p className="text-sm font-semibold font-body text-gray-700">Outlet Details</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Outlet Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Daily Sales Target (₹)</label>
            <input type="number" inputMode="numeric" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
            <p className="text-xs text-gray-400 font-body mt-1">Current: {formatINR(parseFloat(dailyTarget) || 0)}</p>
          </div>
        </div>
        <button onClick={saveOutlet} disabled={saving}
          className="w-full h-11 rounded-xl text-white text-sm font-body font-semibold mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#700000' }}>
          {saving ? <Spinner size={18} /> : saved === 'outlet' ? '✓ Saved!' : 'Save Outlet Details'}
        </button>
      </div>

      {/* Location Management */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MapPin size={16} style={{ color: '#9c7738' }} />
            <p className="text-sm font-semibold font-body text-gray-700">Attendance Locations</p>
          </div>
          <button onClick={() => setShowAddLoc(true)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-white text-[11px] font-body font-semibold"
            style={{ backgroundColor: '#700000' }}>
            <Plus size={11} /> Add
          </button>
        </div>
        <p className="text-xs text-gray-400 font-body mb-4">
          Staff must be within the radius to clock in. First location is active immediately. Additional locations need HQ approval.
        </p>

        {locations.length === 0 ? (
          <p className="text-sm text-gray-400 font-body text-center py-4">No locations set yet.</p>
        ) : (
          <div className="space-y-2">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-start justify-between bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-body font-semibold text-gray-800">{loc.label}</p>
                    {loc.is_primary && <span className="text-[10px] font-body px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">Primary</span>}
                  </div>
                  <p className="text-[11px] font-mono text-gray-400">{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</p>
                  <p className="text-[11px] text-gray-400 font-body">Radius: {loc.radius_meters}m</p>
                </div>
                <span className={`text-[10px] font-semibold font-body px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[loc.status] || 'bg-gray-100 text-gray-500'}`}>
                  {loc.status === 'pending' ? 'Awaiting HQ' : loc.status === 'active' ? 'Active' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add location form */}
        {showAddLoc && (
          <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
            <p className="text-sm font-semibold font-body text-gray-700 mb-3">New Location</p>
            <div className="space-y-2">
              <input value={locForm.label} onChange={e => setLocForm(p => ({ ...p, label: e.target.value }))}
                placeholder="Label (e.g. Main Entrance, Back Gate)"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={locForm.lat} onChange={e => setLocForm(p => ({ ...p, lat: e.target.value }))}
                  placeholder="Latitude" type="number" step="any"
                  className="h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none font-mono" />
                <input value={locForm.lng} onChange={e => setLocForm(p => ({ ...p, lng: e.target.value }))}
                  placeholder="Longitude" type="number" step="any"
                  className="h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none font-mono" />
              </div>
              <div className="flex gap-2">
                <input value={locForm.radius_meters} onChange={e => setLocForm(p => ({ ...p, radius_meters: e.target.value }))}
                  placeholder="Radius (m)" type="number"
                  className="flex-1 h-10 px-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
                <button onClick={useCurrentLocation}
                  className="px-3 h-10 rounded-xl border text-xs font-body font-medium flex items-center gap-1"
                  style={{ borderColor: '#700000', color: '#700000' }}>
                  <MapPin size={12} /> Use GPS
                </button>
              </div>
            </div>
            {locations.filter(l => l.status === 'active').length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
                <p className="text-xs text-amber-700 font-body">This location will be sent to HQ for approval before becoming active.</p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowAddLoc(false); setLocForm({ label: '', lat: '', lng: '', radius_meters: '200' }) }}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
              <button onClick={addLocation} disabled={addingLoc}
                className="flex-1 h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}>
                {addingLoc ? <Spinner size={18} /> : 'Add Location'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock thresholds */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Package size={16} style={{ color: '#9c7738' }} />
          <p className="text-sm font-semibold font-body text-gray-700">Low Stock Thresholds</p>
        </div>
        <p className="text-xs text-gray-400 font-body mb-4">Alert triggers when stock falls at or below this number.</p>
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-gray-700 truncate">{p.line} {p.variant}</p>
                <p className="text-[10px] text-gray-400 font-body">{p.size}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="numeric"
                  value={thresholds[p.id] ?? '5'}
                  onChange={e => setThresholds(prev => ({ ...prev, [p.id]: e.target.value }))}
                  className="w-16 h-9 text-center border border-gray-200 rounded-lg font-body text-sm focus:outline-none" />
                <button onClick={() => saveThreshold(p.id, thresholds[p.id] ?? '5')}
                  className="text-xs font-body font-semibold px-3 h-9 rounded-lg text-white flex-shrink-0"
                  style={{ backgroundColor: saved === 'threshold_' + p.id ? '#16a34a' : '#700000' }}>
                  {saved === 'threshold_' + p.id ? '✓' : 'Set'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
