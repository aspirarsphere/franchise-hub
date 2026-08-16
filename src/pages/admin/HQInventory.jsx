import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Package, Edit2, X, ChevronDown } from 'lucide-react'

function getStockStatus(item) {
  const threshold = item.low_threshold || 5
  if (!item.current_stock && item.current_stock !== 0) return { label: 'Not Set', color: 'text-gray-400', bg: 'bg-gray-50', dot: 'bg-gray-300' }
  if (item.current_stock <= 0) return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
  if (item.current_stock <= threshold) return { label: 'Low', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' }
  return { label: 'Good', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' }
}

export default function HQInventory() {
  const [franchises, setFranchises] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFranchise, setSelectedFranchise] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [editStock, setEditStock] = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadBase() }, [])
  useEffect(() => { if (selectedFranchise) loadInventory() }, [selectedFranchise])

  async function loadBase() {
    const [fRes, pRes] = await Promise.all([
      supabase.from('franchises').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('products').select('*').order('line')
    ])
    setFranchises(fRes.data || [])
    setProducts(pRes.data || [])
    if (fRes.data?.length > 0) setSelectedFranchise(fRes.data[0].id)
    setLoading(false)
  }

  async function loadInventory() {
    const { data } = await supabase.from('inventory').select('*').eq('franchise_id', selectedFranchise)
    setInventory(data || [])
  }

  function openEdit(p, inv) {
    setEditItem({ ...p, inventory: inv })
    setEditStock(inv?.current_stock ?? '')
    setEditThreshold(inv?.low_threshold ?? 5)
  }

  async function saveStock() {
    if (editStock === '') { alert('Enter stock quantity.'); return }
    setEditSaving(true)
    const inv = editItem.inventory
    if (inv) {
      await supabase.from('inventory')
        .update({ current_stock: parseInt(editStock), low_threshold: parseInt(editThreshold) || 5 })
        .eq('id', inv.id)
    } else {
      await supabase.from('inventory').insert({
        franchise_id: selectedFranchise,
        product_id: editItem.id,
        current_stock: parseInt(editStock),
        low_threshold: parseInt(editThreshold) || 5
      })
    }
    setEditSaving(false)
    setEditItem(null)
    loadInventory()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const merged = products.map(p => ({ ...p, inv: inventory.find(i => i.product_id === p.id) }))
  const alerts = merged.filter(p => p.inv && p.inv.current_stock <= (p.inv.low_threshold || 5))
  const franchise = franchises.find(f => f.id === selectedFranchise)

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Package size={20} style={{ color: '#700000' }} />
        <h2 className="font-heading text-2xl font-semibold text-gray-800">Inventory</h2>
      </div>

      {/* Franchise selector */}
      <div className="relative mb-5">
        <select
          value={selectedFranchise}
          onChange={e => setSelectedFranchise(e.target.value)}
          className="w-full h-12 px-4 pr-10 border border-gray-200 rounded-xl font-body text-sm focus:outline-none bg-white appearance-none">
          {franchises.map(f => (
            <option key={f.id} value={f.id}>{f.name} {f.code ? `(${f.code})` : ''}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-xl font-bold text-gray-800">{merged.filter(p => p.inv).length}</p>
          <p className="text-[10px] text-gray-400 font-body">Tracked</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-xl font-bold text-amber-500">{alerts.length}</p>
          <p className="text-[10px] text-gray-400 font-body">Low Stock</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-xl font-bold text-gray-400">{merged.filter(p => !p.inv).length}</p>
          <p className="text-[10px] text-gray-400 font-body">Not Set</p>
        </div>
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {merged.map(p => {
          const status = getStockStatus(p.inv || {})
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
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-heading font-bold text-gray-800">{p.inv?.current_stock ?? '–'}</p>
                  <p className="text-[10px] text-gray-400 font-body">units · alert at {p.inv?.low_threshold ?? '–'}</p>
                </div>
                <button onClick={() => openEdit(p, p.inv)}
                  className="flex items-center gap-1 text-xs font-body font-semibold px-3 h-8 rounded-xl border"
                  style={{ borderColor: '#700000', color: '#700000' }}>
                  <Edit2 size={11} /> Edit
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-t-3xl w-full p-6 fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-heading text-lg font-semibold text-gray-800">Update Stock</h3>
              <button onClick={() => setEditItem(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400 font-body mb-1">{franchise?.name}</p>
            <p className="text-sm font-body text-gray-500 mb-4">{editItem.line} {editItem.variant} · {editItem.size}</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Current Stock (units) *</label>
                <input type="number" inputMode="numeric" min="0"
                  value={editStock}
                  onChange={e => setEditStock(e.target.value)}
                  placeholder="0"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Low Stock Alert Threshold</label>
                <input type="number" inputMode="numeric" min="0"
                  value={editThreshold}
                  onChange={e => setEditThreshold(e.target.value)}
                  placeholder="5"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
              <button onClick={saveStock} disabled={editSaving}
                className="flex-1 h-12 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}>
                {editSaving ? <Spinner size={18} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
