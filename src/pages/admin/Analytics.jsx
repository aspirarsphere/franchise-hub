import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#700000', '#9c7738', '#b8932e', '#8b0000', '#c4a55b', '#500000', '#d4b87a', '#3d0000']

export default function Analytics() {
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAnalytics() }, [period])

  async function loadAnalytics() {
    setLoading(true)
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)

    const [salesRes, skuRes, franchiseRes] = await Promise.all([
      supabase.from('sales').select('total, created_at, franchise_id, franchises(name)').gte('created_at', from + 'T00:00:00+05:30').order('created_at'),
      supabase.from('sales').select('products').gte('created_at', from + 'T00:00:00+05:30'),
      supabase.from('franchises').select('id, name').eq('is_active', true)
    ])

    // Daily revenue line chart
    const dayMap = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      dayMap[key] = { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0 }
    }
    salesRes.data?.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (dayMap[key]) dayMap[key].revenue += s.total || 0
    })
    const revenueChart = Object.values(dayMap)

    // SKU breakdown
    const skuMap = {}
    const products = await supabase.from('products').select('id, name')
    const prodMap = Object.fromEntries((products.data || []).map(p => [p.id, `${p.line} ${p.variant}`]))
    skuRes.data?.forEach(s => {
      ;(s.products || []).forEach(item => {
        const name = prodMap[item.product_id] || 'Unknown'
        skuMap[name] = (skuMap[name] || 0) + (item.quantity || 0)
      })
    })
    const skuChart = Object.entries(skuMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, qty]) => ({ name: name.length > 16 ? name.slice(0, 14) + '…' : name, qty }))

    // Franchise comparison
    const fMap = {}
    franchiseRes.data?.forEach(f => { fMap[f.id] = { name: f.name.length > 12 ? f.name.slice(0, 10) + '…' : f.name, revenue: 0 } })
    salesRes.data?.forEach(s => {
      if (fMap[s.franchise_id]) fMap[s.franchise_id].revenue += s.total || 0
    })
    const franchiseChart = Object.values(fMap).sort((a, b) => b.revenue - a.revenue)

    setData({ revenueChart, skuChart, franchiseChart })
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
            className={`flex-1 h-9 rounded-xl text-xs font-body font-semibold capitalize transition-all ${period === p ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
            style={period === p ? { backgroundColor: '#700000' } : {}}
          >
            {p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          {/* Revenue trend */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Revenue Trend</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis hide />
                <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#700000" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#700000' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKU breakdown */}
          {data.skuChart.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Top SKUs by Units Sold</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.skuChart} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#6b7280' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                    {data.skuChart.map((_, i) => <Cell key={i} fill={i === 0 ? '#9c7738' : '#700000'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Franchise comparison */}
          {data.franchiseChart.length > 1 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-4">Franchise Comparison</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.franchiseChart} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {data.franchiseChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
