import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR, todayIST } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const COLORS = ['#700000', '#9c7738', '#b8932e', '#8b0000', '#c4a55b', '#500000', '#d4b87a', '#3d0000']

export default function OwnerAnalytics() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadAnalytics()
  }, [profile, period])

  async function loadAnalytics() {
    setLoading(true)
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)

    const { data: sales } = await supabase
      .from('sales')
      .select('total, created_at, products, customer_phone')
      .eq('franchise_id', profile.franchise_id)
      .gte('created_at', from + 'T00:00:00+05:30')
      .order('created_at')

    if (!sales) { setLoading(false); return }

    // Daily revenue line chart
    const dayMap = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      dayMap[key] = { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0 }
    }
    sales.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (dayMap[key]) dayMap[key].revenue += s.total || 0
    })
    const revenueChart = Object.values(dayMap)

    // SKU breakdown pie
    const prodRes = await supabase.from('products').select('id, name')
    const prodMap = Object.fromEntries((prodRes.data || []).map(p => [p.id, `${p.line} ${p.variant}`]))
    const skuMap = {}
    sales.forEach(s => {
      ;(s.products || []).forEach(item => {
        const name = prodMap[item.product_id] || 'Unknown'
        skuMap[name] = (skuMap[name] || 0) + (item.quantity || 0)
      })
    })
    const skuChart = Object.entries(skuMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 12) + '…' : name, value }))

    // Peak hours bar chart (IST)
    const hourMap = {}
    for (let h = 0; h < 24; h++) hourMap[h] = { hour: h, count: 0 }
    sales.forEach(s => {
      const h = parseInt(new Date(s.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
      if (!isNaN(h) && hourMap[h] !== undefined) hourMap[h].count++
    })
    const peakChart = Object.values(hourMap).filter(h => h.hour >= 7 && h.hour <= 22)

    // Repeat customers
    const phoneCount = {}
    sales.forEach(s => { if (s.customer_phone) phoneCount[s.customer_phone] = (phoneCount[s.customer_phone] || 0) + 1 })
    const repeatCustomers = Object.values(phoneCount).filter(c => c >= 2).length

    // Average order value
    const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0)
    const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

    setData({ revenueChart, skuChart, peakChart, repeatCustomers, avgOrderValue, totalRevenue, salesCount: sales.length })
    setLoading(false)
  }

  return (
    <div className="px-4 py-5 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-4">Analytics</h2>

      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {['week', 'month', 'quarter'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 h-9 rounded-xl text-xs font-body font-semibold transition-all ${period === p ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
            style={period === p ? { backgroundColor: '#700000' } : {}}
          >
            {p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !data ? (
        <p className="text-center text-gray-400 font-body py-12">No sales data for this period.</p>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 font-body uppercase tracking-wide mb-1">Avg Order Value</p>
              <p className="font-heading text-xl font-bold" style={{ color: '#9c7738' }}>{formatINR(Math.round(data.avgOrderValue))}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 font-body uppercase tracking-wide mb-1">Repeat Customers</p>
              <p className="font-heading text-xl font-bold" style={{ color: '#700000' }}>{data.repeatCustomers}</p>
            </div>
          </div>

          {/* Revenue trend */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Revenue Trend</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis hide />
                <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#700000" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#700000' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKU pie chart */}
          {data.skuChart.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Sales by SKU (units)</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={data.skuChart} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {data.skuChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} units`} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {data.skuChart.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-body text-gray-600 truncate">{item.name}</span>
                      <span className="text-[10px] font-body font-semibold text-gray-800 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Peak hours */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Peak Hours</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={data.peakChart} barSize={14}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={h => h === 12 ? '12pm' : h < 12 ? h + 'am' : (h - 12) + 'pm'} />
                <YAxis hide />
                <Tooltip labelFormatter={h => `${h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm'}`} formatter={v => [`${v} sales`, '']} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.peakChart.map((entry, i) => {
                    const max = Math.max(...data.peakChart.map(d => d.count))
                    return <Cell key={i} fill={entry.count === max ? '#9c7738' : '#700000'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
