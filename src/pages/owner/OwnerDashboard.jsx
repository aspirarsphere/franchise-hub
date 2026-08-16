import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR, todayIST } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Users, ShoppingCart, Package, AlertTriangle, Glasses } from 'lucide-react'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadDashboard()
  }, [profile])

  async function loadDashboard() {
    const today = todayIST()
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

    const [salesRes, staffRes, inventoryRes, weekSalesRes, vrRes] = await Promise.all([
      supabase.from('sales')
        .select('total, products, created_at, customer_name')
        .eq('franchise_id', profile.franchise_id)
        .gte('created_at', today + 'T00:00:00+05:30')
        .order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('id, full_name, attendance!inner(clock_in_time)')
        .eq('franchise_id', profile.franchise_id)
        .eq('role', 'staff')
        .eq('attendance.date', today),
      supabase.from('inventory')
        .select('*, products(line, variant)')
        .eq('franchise_id', profile.franchise_id),
      supabase.from('sales')
        .select('total, created_at')
        .eq('franchise_id', profile.franchise_id)
        .gte('created_at', weekAgo + 'T00:00:00+05:30')
        .order('created_at'),
      supabase.from('vr_registrations')
        .select('type')
        .eq('franchise_id', profile.franchise_id)
        .gte('created_at', today + 'T00:00:00+05:30')
    ])

    // Weekly chart data
    const weekMap = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      weekMap[key] = { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), revenue: 0 }
    }
    weekSalesRes.data?.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (weekMap[key]) weekMap[key].revenue += s.total || 0
    })
    const weekChart = Object.values(weekMap)
    const maxRev = Math.max(...weekChart.map(d => d.revenue))

    // Top SKU
    const skuCount = {}
    salesRes.data?.forEach(sale => {
      ;(sale.products || []).forEach(item => {
        skuCount[item.product_id] = (skuCount[item.product_id] || 0) + (item.quantity || 0)
      })
    })
    const topSkuId = Object.entries(skuCount).sort((a, b) => b[1] - a[1])[0]?.[0]

    // Stock alerts
    const alerts = (inventoryRes.data || []).filter(i => i.current_stock <= (i.low_threshold || 5))

    const todayRevenue = salesRes.data?.reduce((s, r) => s + (r.total || 0), 0) || 0
    const target = profile.franchises?.daily_target || 10000

    setData({
      todayRevenue,
      todayCount: salesRes.data?.length || 0,
      target,
      staffPresent: staffRes.data?.length || 0,
      totalStaff: 0,
      recentSales: salesRes.data?.slice(0, 10) || [],
      weekChart,
      maxRev,
      topSku: topSkuId,
      alerts,
      inventory: inventoryRes.data || [],
      vrToday: vrRes.data?.length || 0,
      vrFree: vrRes.data?.filter(r => r.type === 'free').length || 0,
      vrPaid: vrRes.data?.filter(r => r.type === 'paid').length || 0,
    })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const progressPct = Math.min(100, Math.round((data.todayRevenue / data.target) * 100))

  return (
    <div className="px-4 py-5 fade-in space-y-5">
      {/* Revenue + Target */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-1">Today's Revenue</p>
        <p className="font-heading text-4xl font-bold mb-3" style={{ color: '#9c7738' }}>
          {formatINR(data.todayRevenue)}
        </p>
        <div className="flex justify-between text-xs font-body text-gray-400 mb-1.5">
          <span>Progress to daily target</span>
          <span style={{ color: '#700000' }}>{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: progressPct + '%', backgroundColor: '#700000' }} />
        </div>
        <p className="text-xs text-gray-400 font-body mt-1.5">Target: {formatINR(data.target)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <ShoppingCart size={16} className="mx-auto text-gold mb-1" />
          <p className="font-heading text-xl font-bold text-gray-800">{data.todayCount}</p>
          <p className="text-[10px] text-gray-400 font-body">Sales</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <Users size={16} className="mx-auto text-gold mb-1" />
          <p className="font-heading text-xl font-bold text-gray-800">{data.staffPresent}</p>
          <p className="text-[10px] text-gray-400 font-body">Staff In</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <Package size={16} className="mx-auto text-gold mb-1" />
          <p className="font-heading text-xl font-bold text-gray-800">{data.alerts.length}</p>
          <p className="text-[10px] text-gray-400 font-body">Alerts</p>
        </div>
      </div>

      {/* VR summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Glasses size={16} style={{ color: '#700000' }} />
          <p className="text-xs font-semibold font-body text-gray-500 uppercase tracking-wider">VR Experience Today</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-heading text-2xl font-bold text-gray-800">{data.vrToday}</p>
            <p className="text-[10px] text-gray-400 font-body">Total</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-green-600">{data.vrFree}</p>
            <p className="text-[10px] text-gray-400 font-body">Free</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold" style={{ color: '#9c7738' }}>{data.vrPaid}</p>
            <p className="text-[10px] text-gray-400 font-body">Paid</p>
          </div>
        </div>
      </div>

      {/* Stock alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-sm font-semibold font-body text-red-700">Low Stock Alert</p>
          </div>
          {data.alerts.slice(0, 3).map(item => (
            <div key={item.id} className="flex justify-between text-xs font-body text-red-600 py-0.5">
              <span>{item.products?.line} {item.products?.variant}</span>
              <span>{item.current_stock} left</span>
            </div>
          ))}
        </div>
      )}

      {/* Weekly chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Weekly Revenue</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.weekChart} barSize={28}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
              {data.weekChart.map((entry, i) => (
                <Cell key={i} fill={entry.revenue === data.maxRev ? '#9c7738' : '#700000'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent sales */}
      <div>
        <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">Recent Sales</p>
        {data.recentSales.length === 0 ? (
          <p className="text-sm text-gray-400 font-body text-center py-8">No sales yet today</p>
        ) : (
          <div className="space-y-2">
            {data.recentSales.map((sale, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm border border-gray-100">
                <div>
                  <p className="text-sm font-body font-medium text-gray-800">{sale.customer_name}</p>
                  <p className="text-xs text-gray-400 font-body">{new Date(sale.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
                <p className="font-body font-bold text-sm" style={{ color: '#700000' }}>{formatINR(sale.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
