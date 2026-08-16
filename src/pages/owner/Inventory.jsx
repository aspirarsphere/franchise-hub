import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import { Package, RefreshCw, Truck, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import EmptyState from '../../components/EmptyState'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    bg: 'bg-amber-100',  text: 'text-amber-700',  Icon: Clock },
  approved:   { label: 'Approved',   bg: 'bg-blue-100',   text: 'text-blue-700',   Icon: CheckCircle },
  dispatched: { label: 'Dispatched', bg: 'bg-purple-100', text: 'text-purple-700', Icon: Truck },
  fulfilled:  { label: 'Fulfilled',  bg: 'bg-green-100',  text: 'text-green-700',  Icon: CheckCircle },
  rejected:   { label: 'Rejected',   bg: 'bg-red-100',    text: 'text-red-600',    Icon: XCircle },
}

export default function Inventory() {
  const { profile } = useAuth()
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [restockRequests, setRestockRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [form, setForm] = useState({ product_id: '', quantity: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [expandedRequest, setExpandedRequest] = useState(null)

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadAll()
  }, [profile])

  async function loadAll() {
    const [invRes, prodRes, restockRes] = await Promise.all([
      supabase.from('inventory').select('*').eq('franchise_id', profile.franchise_id),
      supabase.from('products').select('*').order('line'),
      supabase.from('restock_requests')
        .select('*')
        .eq('franchise_id', profile.franchise_id)
        .order('created_at', { ascending: false })
    ])
    setProducts(prodRes.data || [])
    setInventory(invRes.data || [])
    setRestockRequests(restockRes.data || [])
    setLoading(false)
  }

  async function submitRequest() {
    if (!form.product_id || !form.quantity) { alert('Please select a product and quantity.'); return }
    setSubmitting(true)
    const product = products.find(p => p.id === form.product_id)
    const { error } = await supabase.from('restock_requests').insert({
      franchise_id: profile.franchise_id,
      requested_by: profile.id,
      status: 'pending',
      notes: form.notes || null,
      products: [{ product_id: form.product_id, quantity: parseInt(form.quantity), name: `${product?.line} ${product?.variant}` }]
    })
    setSubmitting(false)
    if (error) { alert('Could not send request: ' + error.message); return }
    setShowRequestForm(false)
    setForm({ product_id: '', quantity: '', notes: '' })
    loadAll()
  }

  function getStockStatus(item) {
    const threshold = item.low_threshold || 5
    if (item.current_stock <= 0) return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
    if (item.current_stock <= threshold) return { label: 'Low', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' }
    return { label: 'Good', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const merged = products.map(p => ({ ...p, inventory: inventory.find(i => i.product_id === p.id) }))

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-2xl font-semibold text-gray-800">Stock</h2>
        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-white text-xs font-body font-semibold"
          style={{ backgroundColor: '#700000' }}
        >
          <RefreshCw size={13} /> Request Stock
        </button>
      </div>

      {/* Request form modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowRequestForm(false)}>
          <div className="bg-white rounded-t-3xl w-full p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-semibold text-gray-800 mb-4">Request Stock from HQ</h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Product *</label>
                <select
                  value={form.product_id}
                  onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none bg-white"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.line} {p.variant} ({p.size})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Quantity *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="How many units?"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any special instructions..."
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRequestForm(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-body text-gray-600">
                Cancel
              </button>
              <button onClick={submitRequest} disabled={submitting}
                className="flex-1 h-12 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}>
                {submitting ? <Spinner size={18} /> : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock list */}
      <div className="space-y-2 mb-8">
        {merged.map(p => {
          const inv = p.inventory
          const status = inv ? getStockStatus(inv) : { label: 'Not Set', color: 'text-gray-400', bg: 'bg-gray-50', dot: 'bg-gray-300' }
          return (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-body font-semibold text-gray-800 truncate">{p.line} {p.variant}</p>
                  <p className="text-xs text-gray-400 font-body">{p.size}</p>
                </div>
                <span className={`text-[11px] font-semibold font-body px-2 py-1 rounded-full flex items-center gap-1 ${status.bg} ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-gray-800">{inv?.current_stock ?? '–'}</p>
              <p className="text-[10px] text-gray-400 font-body">units in stock</p>
            </div>
          )
        })}
      </div>

      {/* Restock requests */}
      <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">Stock Requests</p>
      {restockRequests.length === 0 ? (
        <EmptyState icon={Package} title="No requests yet" message="Tap 'Request Stock' to order from HQ." />
      ) : (
        <div className="space-y-2">
          {restockRequests.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
            const Icon = cfg.Icon
            const isExpanded = expandedRequest === r.id
            const items = r.products || []

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpandedRequest(isExpanded ? null : r.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                      <Icon size={14} className={cfg.text} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-body font-semibold text-gray-800">
                        {items.length > 0 ? items.map(i => i.name).join(', ') : 'Stock Request'}
                      </p>
                      <p className="text-xs text-gray-400 font-body">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold font-body px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2 fade-in">
                    {/* Items requested */}
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm font-body">
                        <span className="text-gray-600">{item.name}</span>
                        <span className="font-semibold text-gray-800">{item.quantity} units</span>
                      </div>
                    ))}

                    {r.notes && (
                      <div className="bg-gray-50 rounded-xl p-3 mt-2">
                        <p className="text-xs text-gray-500 font-body"><span className="font-semibold">Your note:</span> {r.notes}</p>
                      </div>
                    )}

                    {/* HQ response */}
                    {(r.tracking_id || r.send_date || r.hq_notes) && (
                      <div className="bg-purple-50 rounded-xl p-3 mt-2 space-y-1.5">
                        <p className="text-xs font-semibold text-purple-700 font-body uppercase tracking-wide">HQ Update</p>
                        {r.send_date && (
                          <div className="flex justify-between text-xs font-body">
                            <span className="text-gray-500">Dispatch Date</span>
                            <span className="font-semibold text-gray-800">
                              {new Date(r.send_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {r.tracking_id && (
                          <div className="flex justify-between text-xs font-body items-center">
                            <span className="text-gray-500">Tracking ID</span>
                            <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-mono">
                              {r.tracking_id}
                            </span>
                          </div>
                        )}
                        {r.hq_notes && (
                          <p className="text-xs text-gray-600 font-body"><span className="font-semibold">HQ Note:</span> {r.hq_notes}</p>
                        )}
                      </div>
                    )}
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
