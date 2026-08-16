import { useAuth } from '../../context/AuthContext'
import { formatIST, todayIST } from '../../lib/utils'
import { Clock, ShoppingCart, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../lib/utils'
import Spinner from '../../components/Spinner'

export default function StaffHome() {
  const { profile } = useAuth()
  const [todaySales, setTodaySales] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const today = todayIST()
    Promise.all([
      supabase
        .from('sales')
        .select('total')
        .eq('staff_id', profile.id)
        .gte('created_at', today + 'T00:00:00+05:30')
        .lte('created_at', today + 'T23:59:59+05:30'),
      supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle()
    ]).then(([salesRes, attRes]) => {
      const total = salesRes.data?.reduce((s, r) => s + (r.total || 0), 0) || 0
      setTodaySales({ count: salesRes.data?.length || 0, total })
      setAttendance(attRes.data)
      setLoading(false)
    })
  }, [profile])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="px-4 py-6 fade-in">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-semibold text-gray-800">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p className="text-sm text-gray-500 font-body mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
        </p>
      </div>

      {/* Attendance status */}
      <div className={`rounded-2xl p-4 mb-4 border ${attendance?.clock_in_time ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${attendance?.clock_in_time ? 'bg-green-500' : 'bg-amber-400'}`}>
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <p className="font-body font-semibold text-gray-800 text-sm">
              {attendance?.clock_in_time ? 'Clocked In' : 'Not Clocked In'}
            </p>
            <p className="text-xs text-gray-500 font-body">
              {attendance?.clock_in_time
                ? `Since ${formatIST(attendance.clock_in_time, { hour: '2-digit', minute: '2-digit', hour12: true })}`
                : 'Tap Attendance tab to clock in'}
            </p>
          </div>
        </div>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <ShoppingCart size={18} className="text-gold mb-2" />
          <p className="text-2xl font-heading font-bold text-maroon" style={{ color: '#700000' }}>
            {todaySales?.count}
          </p>
          <p className="text-xs text-gray-500 font-body">Sales Today</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <TrendingUp size={18} className="text-gold mb-2" />
          <p className="text-2xl font-heading font-bold" style={{ color: '#9c7738' }}>
            {formatINR(todaySales?.total)}
          </p>
          <p className="text-xs text-gray-500 font-body">Revenue Today</p>
        </div>
      </div>

      {/* Quick actions */}
      <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">Quick Actions</p>
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => window.location.href = '/staff/sale'}
          className="w-full h-14 rounded-2xl font-body font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: '#700000' }}
        >
          <ShoppingCart size={18} /> Start New Sale
        </button>
      </div>
    </div>
  )
}
