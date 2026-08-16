import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import { Store, Plus, Power } from 'lucide-react'
import { formatINR, todayIST } from '../../lib/utils'

export default function Franchises() {
  const [franchises, setFranchises] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', owner_phone: '', address: '', franchise_code: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { loadFranchises() }, [])

  async function loadFranchises() {
    const today = todayIST()
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

  async function toggleActive(franchise) {
    await supabase.from('franchises').update({ is_active: !franchise.is_active }).eq('id', franchise.id)
    setConfirm(null)
    loadFranchises()
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
            { key: 'name', placeholder: 'Outlet name *', required: true },
            { key: 'franchise_code', placeholder: 'Franchise code (e.g. CHN01) *', required: true },
            { key: 'address', placeholder: 'Address' },
            { key: 'owner_phone', placeholder: 'Owner phone (10 digits)' },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-maroon mb-2"
            />
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={() => setAdding(false)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
            <button onClick={addFranchise} disabled={addLoading} className="flex-1 h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center" style={{ backgroundColor: '#700000' }}>
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
              <div key={f.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${f.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-body font-bold text-gray-800">{f.name}</p>
                      <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-cream-dark text-gray-500">{f.franchise_code}</span>
                    </div>
                    {f.address && <p className="text-xs text-gray-400 font-body mt-0.5">{f.address}</p>}
                  </div>
                  <button
                    onClick={() => setConfirm(f)}
                    className={`p-2 rounded-full ${f.is_active ? 'hover:bg-red-50' : 'hover:bg-green-50'} transition-colors`}
                  >
                    <Power size={16} className={f.is_active ? 'text-red-400' : 'text-green-500'} />
                  </button>
                </div>
                <div className="flex gap-4 text-xs font-body text-gray-400">
                  <span>All-time: <strong className="text-gray-700">{formatINR(totalRevenue)}</strong></span>
                  <span className={`font-semibold ${f.is_active ? 'text-green-600' : 'text-red-500'}`}>{f.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.is_active ? 'Deactivate Franchise' : 'Activate Franchise'}
        message={`${confirm?.is_active ? 'Deactivate' : 'Activate'} ${confirm?.name}? ${confirm?.is_active ? 'Staff will lose access.' : ''}`}
        danger={confirm?.is_active}
        onConfirm={() => toggleActive(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
