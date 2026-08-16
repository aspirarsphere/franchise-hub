import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Users, Plus, Trash2, Clock, Mail } from 'lucide-react'
import { todayIST } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Team() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [createdStaff, setCreatedStaff] = useState(null)
  const today = todayIST()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadTeam()
  }, [profile])

  async function loadTeam() {
    const [staffRes, attRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('franchise_id', profile.franchise_id).eq('role', 'staff'),
      supabase.from('attendance').select('*').eq('franchise_id', profile.franchise_id).eq('date', today)
    ])
    setStaff(staffRes.data || [])
    setAttendance(attRes.data || [])
    setLoading(false)
  }

  async function addStaff() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      alert('Please fill in name, email and password.')
      return
    }
    setAddLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: 'staff',
        franchise_id: profile.franchise_id,
      })
    })
    const result = await res.json()
    setAddLoading(false)

    if (!res.ok || result.error) { alert('Error: ' + (result.error || 'Could not create user')); return }

    setCreatedStaff({ name: form.full_name, email: form.email, password: form.password })
    setAdding(false)
    setForm({ full_name: '', email: '', password: '' })
    loadTeam()
  }

  async function removeStaff(staffId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: staffId })
    })
    const result = await res.json()
    setConfirm(null)
    if (!res.ok || result.error) { alert('Error: ' + (result.error || 'Could not remove staff')); return }
    loadTeam()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center justify-between mb-5 gap-2">
        <h2 className="font-heading text-2xl font-semibold text-gray-800">Team</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate('/owner/attendance')}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-body font-medium border"
            style={{ borderColor: '#700000', color: '#700000' }}>
            <Clock size={13} /> Attendance
          </button>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-white text-xs font-body font-semibold"
            style={{ backgroundColor: '#700000' }}>
            <Plus size={13} /> Add Staff
          </button>
        </div>
      </div>

      {/* Created credentials card */}
      {createdStaff && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 fade-in">
          <p className="text-sm font-semibold text-green-700 font-body mb-2">✓ Staff added — share these login details:</p>
          <div className="space-y-1 text-sm font-body text-gray-700">
            <p><span className="text-gray-500">Name:</span> {createdStaff.name}</p>
            <p><span className="text-gray-500">Email:</span> {createdStaff.email}</p>
            <p><span className="text-gray-500">Password:</span> <span className="font-mono font-bold">{createdStaff.password}</span></p>
          </div>
          <p className="text-xs text-green-600 font-body mt-2">✓ Account is ready — they can log in immediately with these credentials.</p>
          <button onClick={() => setCreatedStaff(null)} className="text-xs text-green-600 font-body mt-1 underline">Dismiss</button>
        </div>
      )}

      {/* Add staff form */}
      {adding && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} style={{ color: '#9c7738' }} />
            <p className="text-sm font-semibold font-body text-gray-700">Add New Staff Member</p>
          </div>
          <div className="space-y-2 mb-3">
            <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Full name *"
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email address *"
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none" />
            <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Temporary password *"
              className="w-full h-11 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setForm({ full_name: '', email: '', password: '' }) }}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-body text-gray-600">Cancel</button>
            <button onClick={addStaff} disabled={addLoading}
              className="flex-1 h-10 rounded-xl text-white text-sm font-body font-semibold flex items-center justify-center"
              style={{ backgroundColor: '#700000' }}>
              {addLoading ? <Spinner size={18} /> : 'Add Staff'}
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff added" message="Add staff members so they can log in and record sales & attendance." />
      ) : (
        <div className="space-y-2">
          {staff.map(s => {
            const att = attendance.find(a => a.user_id === s.id)
            const sessions = att?.sessions || []
            const hasOpen = sessions.some(x => x.in && !x.out)
            const isOnBreak = att?.clock_in_time && !att?.clock_out_time && !hasOpen
            const statusLabel = !att?.clock_in_time ? 'Absent' : att?.clock_out_time ? 'Left' : isOnBreak ? 'On Break' : 'Working'
            const statusColor = !att?.clock_in_time ? 'bg-red-400' : att?.clock_out_time ? 'bg-gray-300' : isOnBreak ? 'bg-amber-400' : 'bg-green-500'
            return (
              <div key={s.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold font-body ${statusColor}`}>
                      {s.full_name?.charAt(0) || '?'}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-body font-semibold text-gray-800">{s.full_name}</p>
                    <p className="text-xs text-gray-400 font-body">{statusLabel}</p>
                  </div>
                </div>
                <button onClick={() => setConfirm(s)} className="p-2 rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Remove Staff"
        message={`Remove ${confirm?.full_name} from your team? They will lose access to this outlet.`}
        danger
        onConfirm={() => removeStaff(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
