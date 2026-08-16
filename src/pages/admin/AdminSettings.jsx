import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Bell, DollarSign, Users } from 'lucide-react'
import { formatINR } from '../../lib/utils'

export default function AdminSettings() {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPrice, setEditingPrice] = useState(null)
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [broadcast, setBroadcast] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [prodRes, usersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('profiles').select('*, franchises(name)').order('full_name')
    ])
    setProducts(prodRes.data || [])
    setUsers(usersRes.data || [])
    setLoading(false)
  }

  async function savePrice(productId) {
    if (!newPrice || isNaN(newPrice)) return
    setSaving(true)
    await supabase.from('products').update({ price: parseFloat(newPrice) }).eq('id', productId)
    setSaving(false)
    setEditingPrice(null)
    setNewPrice('')
    loadAll()
  }

  async function changeRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    loadAll()
  }

  async function sendBroadcast() {
    if (!broadcast.trim()) return
    setSending(true)
    // Get all franchise_owner profiles
    const { data: owners } = await supabase.from('profiles').select('id').eq('role', 'franchise_owner')
    if (owners?.length) {
      await supabase.from('notifications').insert(
        owners.map(o => ({
          user_id: o.id,
          type: 'broadcast',
          title: 'Message from HQ',
          body: broadcast.trim(),
          is_read: false
        }))
      )
    }
    setSending(false)
    setSent(true)
    setBroadcast('')
    setTimeout(() => setSent(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-5 fade-in space-y-6">
      <h2 className="font-heading text-2xl font-semibold text-gray-800">Settings</h2>

      {/* Broadcast */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} style={{ color: '#9c7738' }} />
          <p className="text-sm font-semibold font-body text-gray-700">Broadcast to Owners</p>
        </div>
        <textarea
          value={broadcast}
          onChange={e => setBroadcast(e.target.value)}
          placeholder="Type your message to all franchise owners…"
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-maroon resize-none mb-3"
        />
        <button
          onClick={sendBroadcast}
          disabled={sending || !broadcast.trim()}
          className="w-full h-11 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#700000' }}
        >
          {sending ? <Spinner size={18} /> : sent ? '✓ Sent!' : 'Send Broadcast'}
        </button>
      </div>

      {/* Product prices */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} style={{ color: '#9c7738' }} />
          <p className="text-sm font-semibold font-body text-gray-700">Product Prices</p>
        </div>
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-body font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 font-body">{p.size || p.product_line}</p>
              </div>
              {editingPrice === p.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    className="w-20 h-9 px-2 border border-gray-200 rounded-lg font-body text-sm focus:outline-none focus:border-maroon text-center"
                    autoFocus
                  />
                  <button onClick={() => savePrice(p.id)} disabled={saving} className="text-xs text-white font-body font-semibold px-3 h-9 rounded-lg" style={{ backgroundColor: '#700000' }}>
                    {saving ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingPrice(null)} className="text-xs text-gray-500 font-body px-2 h-9">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingPrice(p.id); setNewPrice(String(p.price)) }}
                  className="text-sm font-body font-bold"
                  style={{ color: '#9c7738' }}
                >
                  {formatINR(p.price)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User management */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: '#9c7738' }} />
          <p className="text-sm font-semibold font-body text-gray-700">User Accounts</p>
        </div>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body font-medium text-gray-800">{u.full_name || u.phone}</p>
                  <p className="text-xs text-gray-400 font-body">{u.franchises?.name || 'No outlet'}</p>
                </div>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className="text-xs font-body border border-gray-200 rounded-lg px-2 h-8 bg-white focus:outline-none focus:border-maroon"
                >
                  <option value="staff">Staff</option>
                  <option value="franchise_owner">Owner</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
