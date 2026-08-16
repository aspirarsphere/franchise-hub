import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { todayIST } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import { Glasses, Phone, User, CheckCircle } from 'lucide-react'

export default function VRRegistration() {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', type: 'free' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [todayStats, setTodayStats] = useState({ free: 0, paid: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    if (profile?.franchise_id) fetchToday()
  }, [profile])

  async function fetchToday() {
    const today = todayIST()
    const { data } = await supabase
      .from('vr_registrations')
      .select('*')
      .eq('franchise_id', profile.franchise_id)
      .gte('created_at', today + 'T00:00:00+05:30')
      .order('created_at', { ascending: false })

    if (data) {
      setTodayStats({
        free: data.filter(r => r.type === 'free').length,
        paid: data.filter(r => r.type === 'paid').length
      })
      setRecent(data.slice(0, 5))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter a name.'); return }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.from('vr_registrations').insert({
      franchise_id: profile.franchise_id,
      staff_id: profile.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      type: form.type
    })
    setLoading(false)
    if (err) { setError('Error: ' + err.message); return }
    setSuccess(true)
    setForm({ name: '', phone: '', type: 'free' })
    fetchToday()
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Glasses size={22} style={{ color: '#700000' }} />
        <h2 className="font-heading text-2xl font-semibold text-gray-800">VR Registration</h2>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-2xl font-bold text-gray-800">{todayStats.free + todayStats.paid}</p>
          <p className="text-[10px] text-gray-400 font-body">Total Today</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-2xl font-bold text-green-600">{todayStats.free}</p>
          <p className="text-[10px] text-gray-400 font-body">Free</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-2xl font-bold" style={{ color: '#9c7738' }}>{todayStats.paid}</p>
          <p className="text-[10px] text-gray-400 font-body">Paid</p>
        </div>
      </div>

      {/* Registration form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <p className="text-sm font-semibold font-body text-gray-700 mb-4">Register New Visitor</p>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm font-body text-green-700 font-semibold">Registered successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Experience type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button type="button"
              onClick={() => setForm(p => ({ ...p, type: 'free' }))}
              className={`flex-1 h-11 text-sm font-body font-semibold transition-all ${form.type === 'free' ? 'text-white' : 'text-gray-500 bg-white'}`}
              style={form.type === 'free' ? { backgroundColor: '#700000' } : {}}>
              Free
            </button>
            <button type="button"
              onClick={() => setForm(p => ({ ...p, type: 'paid' }))}
              className={`flex-1 h-11 text-sm font-body font-semibold transition-all ${form.type === 'paid' ? 'text-white' : 'text-gray-500 bg-white'}`}
              style={form.type === 'paid' ? { backgroundColor: '#9c7738' } : {}}>
              Paid
            </button>
          </div>

          <div className="relative">
            <User size={15} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Visitor name *"
              className="w-full h-12 pl-9 pr-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
            />
          </div>

          <div className="relative">
            <Phone size={15} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="Mobile number *"
              maxLength={10}
              className="w-full h-12 pl-9 pr-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-body">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl text-white font-body font-semibold text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: '#700000' }}>
            {loading ? <Spinner size={20} /> : <><Glasses size={16} /> Register Visitor</>}
          </button>
        </form>
      </div>

      {/* Recent registrations */}
      {recent.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">Recent Today</p>
          <div className="space-y-2">
            {recent.map(r => (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-gray-100">
                <div>
                  <p className="text-sm font-body font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400 font-body">{r.phone}</p>
                </div>
                <span className={`text-[11px] font-semibold font-body px-2.5 py-1 rounded-full ${r.type === 'paid' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {r.type === 'paid' ? 'Paid' : 'Free'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
