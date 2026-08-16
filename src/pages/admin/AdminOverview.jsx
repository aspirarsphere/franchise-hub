import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR, todayIST } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import { TrendingUp, Store, ShoppingCart, Package } from 'lucide-react'

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const today = todayIST()
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const monthStart = today.slice(0, 8) + '01'

    const [todaySales, weekSales, monthSales, franchises, restock] = await Promise.all([
      supabase.from('sales').select('total, franchise_id, franchises(name)').gte('created_at', today + 'T00:00:00+05:30'),
      supabase.from('sales').select('total').gte('created_at', weekAgo + 'T00:00:00+05:30'),
      supabase.from('sales').select('total').gte('created_at', monthStart + 'T00:00:00+05:30'),
      supabase.from('franchises').select('*, profiles(count)').eq('is_active', true),
      supabase.from('restock_requests').select('id', { count: 'exact' }).eq('status', 'pending')
    ])

    // Franchise leaderboard
    const leaderboard = {}
    todaySales.data?.forEach(s => {
      const id = s.franchise_id
      if (!leaderboard[id]) leaderboard[id] = { name: s.franchises?.name || id, revenue: 0, count: 0 }
      leaderboard[id].revenue += s.total || 0
      leaderboard[id].count++
    })
    const ranked = Object.values(leaderboard).sort((a, b) => b.revenue - a.revenue)

    setData({
      todayRev: todaySales.data?.reduce((s, r) => s + (r.total || 0), 0) || 0,
      weekRev: weekSales.data?.reduce((s, r) => s + (r.total || 0), 0) || 0,
      monthRev: monthSales.data?.reduce((s, r) => s + (r.total || 0), 0) || 0,
      todayCount: todaySales.data?.length || 0,
      franchiseCount: franchises.data?.length || 0,
      pendingRestock: restock.count || 0,
      leaderboard: ranked
    })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-5 fade-in space-y-5">
      <h2 className="font-heading text-2xl font-semibold text-gray-800">HQ Overview</h2>

      {/* Big 3 stats */}
      <div className="space-y-3">
        {[
          { label: 'Today\'s Revenue', value: formatINR(data.todayRev), Icon: TrendingUp },
          { label: 'This Week', value: formatINR(data.weekRev), Icon: ShoppingCart },
          { label: 'This Month', value: formatINR(data.monthRev), Icon: Store },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-body uppercase tracking-wider">{label}</p>
              <p className="font-heading text-3xl font-bold mt-1" style={{ color: '#9c7738' }}>{value}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#700000' + '15' }}>
              <Icon size={22} style={{ color: '#700000' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-2xl font-bold text-gray-800">{data.todayCount}</p>
          <p className="text-[10px] text-gray-400 font-body">Sales Today</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="font-heading text-2xl font-bold text-gray-800">{data.franchiseCount}</p>
          <p className="text-[10px] text-gray-400 font-body">Franchises</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className={`font-heading text-2xl font-bold ${data.pendingRestock > 0 ? 'text-red-500' : 'text-gray-800'}`}>{data.pendingRestock}</p>
          <p className="text-[10px] text-gray-400 font-body">Restock</p>
        </div>
      </div>

      {/* Leaderboard */}
      {data.leaderboard.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider">Today's Leaderboard</p>
          <div className="space-y-2">
            {data.leaderboard.map((f, i) => (
              <div
                key={i}
                className={`rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm border ${
                  i === 0 ? 'border-gold/30 bg-amber-50' : i === data.leaderboard.length - 1 && data.leaderboard.length > 1 ? 'border-red-100 bg-red-50' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-heading font-bold text-lg ${i === 0 ? 'text-gold' : 'text-gray-400'}`} style={i === 0 ? { color: '#9c7738' } : {}}>#{i + 1}</span>
                  <div>
                    <p className="text-sm font-body font-semibold text-gray-800">{f.name}</p>
                    <p className="text-xs text-gray-400 font-body">{f.count} sale{f.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="font-body font-bold text-sm" style={{ color: i === 0 ? '#9c7738' : '#700000' }}>{formatINR(f.revenue)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
