import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { Package, Truck, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    bg: 'bg-amber-100',  text: 'text-amber-700' },
  approved:   { label: 'Approved',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  dispatched: { label: 'Dispatched', bg: 'bg-purple-100', text: 'text-purple-700' },
  fulfilled:  { label: 'Fulfilled',  bg: 'bg-green-100',  text: 'text-green-700' },
  rejected:   { label: 'Rejected',   bg: 'bg-red-100',    text: 'text-red-600' },
}

export default function Restock() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => { loadRequests() }, [filter])

  async function loadRequests() {
    setLoading(true)
    const query = supabase
      .from('restock_requests')
      .select('*, franchises(name, address)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query.eq('status', filter)

    const { data } = await query
    setRequests(data || [])
    setLoading(false)
  }

  function openForm(r) {
    setExpanded(r.id)
    setForm({
      status: r.status,
      send_date: r.send_date || '',
      tracking_id: r.tracking_id || '',
      hq_notes: r.hq_notes || '',
    })
  }

  async function updateRequest(id) {
    setUpdating(id)
    const { error } = await supabase.from('restock_requests')
      .update({
        status: form.status,
        send_date: form.send_date || null,
        tracking_id: form.tracking_id || null,
        hq_notes: form.hq_notes || null,
        dispatched_at: form.status === 'dispatched' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    setUpdating(null)
    if (error) { alert('Error: ' + error.message); return }
    setExpanded(null)
    loadRequests()
  }

  return (
    <div className="px-4 py-5 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-5">Stock Requests</h2>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {['pending', 'approved', 'dispatched', 'fulfilled', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-body font-semibold capitalize transition-all ${
              filter === f ? 'text-white' : 'bg-gray-100 text-gray-500'
            }`}
            style={filter === f ? { backgroundColor: '#700000' } : {}}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Package} title="No requests" message={`No ${filter} stock requests.`} />
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
            const isExpanded = expanded === r.id
            const items = r.products || []

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header */}
                <button
                  className="w-full px-4 py-4 flex items-start justify-between gap-3"
                  onClick={() => isExpanded ? setExpanded(null) : openForm(r)}
                >
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-body font-bold text-gray-800 truncate">
                        {r.franchises?.name || 'Unknown Franchise'}
                      </p>
                      <span className={`text-[10px] font-semibold font-body px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-body">
                      {items.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                    </p>
                    <p className="text-xs text-gray-400 font-body mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      {r.tracking_id && <span className="ml-2 text-purple-600 font-medium">· {r.tracking_id}</span>}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />}
                </button>

                {/* Edit panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 fade-in">

                    {/* Items */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wide mb-2">Requested Items</p>
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm font-body">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="font-bold text-gray-800">{item.quantity} units</span>
                        </div>
                      ))}
                      {r.notes && <p className="text-xs text-gray-500 font-body mt-2 pt-2 border-t border-gray-200">Note: {r.notes}</p>}
                    </div>

                    {/* Status */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Status</label>
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none bg-white"
                      >
                        {Object.keys(STATUS_CONFIG).map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Send date */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Dispatch Date</label>
                      <input
                        type="date"
                        value={form.send_date}
                        onChange={e => setForm(p => ({ ...p, send_date: e.target.value }))}
                        className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
                      />
                    </div>

                    {/* Tracking ID */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">
                        <Truck size={11} className="inline mr-1" />Tracking ID / Parcel No.
                      </label>
                      <input
                        value={form.tracking_id}
                        onChange={e => setForm(p => ({ ...p, tracking_id: e.target.value }))}
                        placeholder="e.g. DTDC123456789"
                        className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none font-mono"
                      />
                    </div>

                    {/* HQ Notes */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Note to Franchise</label>
                      <input
                        value={form.hq_notes}
                        onChange={e => setForm(p => ({ ...p, hq_notes: e.target.value }))}
                        placeholder="Any message for the franchise..."
                        className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpanded(null)}
                        className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-body text-gray-600 flex items-center justify-center gap-1"
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button
                        onClick={() => updateRequest(r.id)}
                        disabled={updating === r.id}
                        className="flex-1 h-11 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#700000' }}
                      >
                        {updating === r.id ? <Spinner size={18} /> : <><Check size={14} /> Update</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
