import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { todayIST, formatTime } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { Users } from 'lucide-react'

export default function OwnerAttendance() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [selected, setSelected] = useState(null)
  const [monthRecords, setMonthRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const today = todayIST()

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadData()
  }, [profile])

  async function loadData() {
    const { data: staffData } = await supabase
      .from('profiles')
      .select('*, attendance!inner(clock_in_time, clock_out_time, date)')
      .eq('franchise_id', profile.franchise_id)
      .eq('role', 'staff')

    // Get all staff, even without today's attendance
    const { data: allStaff } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('franchise_id', profile.franchise_id)
      .eq('role', 'staff')

    const { data: todayAtt } = await supabase
      .from('attendance')
      .select('*')
      .eq('franchise_id', profile.franchise_id)
      .eq('date', today)

    const merged = (allStaff || []).map(s => ({
      ...s,
      today: todayAtt?.find(a => a.user_id === s.id) || null
    }))

    setStaff(merged)
    setLoading(false)
  }

  async function loadMonthForStaff(staffId) {
    const firstDay = today.slice(0, 8) + '01'
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', staffId)
      .gte('date', firstDay)
      .order('date', { ascending: false })
    setMonthRecords(data || [])
    setSelected(staffId)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  if (selected) {
    const staffMember = staff.find(s => s.id === selected)
    return (
      <div className="px-4 py-5 fade-in">
        <button onClick={() => setSelected(null)} className="text-gold text-sm font-body font-medium mb-4 flex items-center gap-1">
          ← All Staff
        </button>
        <h2 className="font-heading text-xl font-semibold text-gray-800 mb-1">{staffMember?.full_name}</h2>
        <p className="text-xs text-gray-400 font-body mb-5">Monthly attendance record</p>
        {monthRecords.length === 0 ? (
          <EmptyState icon={Users} title="No records" message="No attendance recorded this month." />
        ) : (
          <div className="space-y-2">
            {monthRecords.map(r => {
              const isLate = r.clock_in_time && new Date(r.clock_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }) >= '10'
              return (
                <div key={r.id} className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm border border-gray-100">
                  <div>
                    <p className="text-sm font-body font-medium text-gray-700">
                      {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </p>
                    <p className="text-xs text-gray-400 font-body mt-0.5">
                      {formatTime(r.clock_in_time)} – {r.clock_out_time ? formatTime(r.clock_out_time) : '–'}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold font-body px-2 py-1 rounded-full ${
                    !r.clock_in_time ? 'bg-red-100 text-red-600' :
                    isLate ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {!r.clock_in_time ? 'Absent' : isLate ? 'Late' : 'Present'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-5 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-2">Team Attendance</h2>
      <p className="text-xs text-gray-400 font-body mb-5">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
      </p>

      {staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff added" message="Add staff members from the Team tab." />
      ) : (
        <div className="space-y-2">
          {staff.map(s => {
            const att = s.today
            const isLate = att?.clock_in_time && new Date(att.clock_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }) >= '10'
            return (
              <button
                key={s.id}
                onClick={() => loadMonthForStaff(s.id)}
                className="w-full bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${att?.clock_in_time ? (isLate ? 'bg-amber-400' : 'bg-green-500') : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm font-body font-semibold text-gray-800">{s.full_name}</p>
                    <p className="text-xs text-gray-400 font-body">
                      {att?.clock_in_time
                        ? (isLate ? `Late · in ${formatTime(att.clock_in_time)}` : `In ${formatTime(att.clock_in_time)}`)
                        + (att?.clock_out_time ? ` · Out ${formatTime(att.clock_out_time)}` : '')
                        : 'Not clocked in'}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold font-body px-2 py-1 rounded-full ${att?.clock_in_time ? (isLate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700') : 'bg-red-100 text-red-600'}`}>
                  {att?.clock_in_time ? (isLate ? 'Late' : 'Present') : 'Absent'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
