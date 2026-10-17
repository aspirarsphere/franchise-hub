import { useState, useEffect, useMemo } from 'react'
import { supabase, supabasePublic } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import { FlaskConical, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RESPONSE_LABELS, IRON_TEST_SELECT, riskStyle, fmtDate, fmtTime } from '../../lib/ironTest'

const PERIODS = [
  { key: 'week',    label: '7 Days',   days: 7 },
  { key: 'month',   label: '30 Days',  days: 30 },
  { key: 'sixmon',  label: '6 Months', days: 180 },
]

function buildChart(tests, period) {
  const now = Date.now()
  if (period === 'week') {
    // One bar per day, last 7 days
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      days.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
        key:   d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        count: 0,
      })
    }
    tests.forEach(t => {
      const k = new Date(t.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const d = days.find(x => x.key === k)
      if (d) d.count++
    })
    return days
  }
  if (period === 'month') {
    // One bar per day, last 30 days
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      days.push({
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
        key:   d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        count: 0,
      })
    }
    tests.forEach(t => {
      const k = new Date(t.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const d = days.find(x => x.key === k)
      if (d) d.count++
    })
    // Only show every 5th label to avoid clutter
    return days.map((d, i) => ({ ...d, label: i % 5 === 0 ? d.label : '' }))
  }
  // 6 months: one bar per month
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }),
      year:  d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    })
  }
  tests.forEach(t => {
    const d = new Date(t.created_at)
    const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth())
    if (m) m.count++
  })
  return months
}

export default function OwnerIronTest() {
  const { profile } = useAuth()
  const [franchiseName, setFranchiseName] = useState(profile?.franchises?.name || null)
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (franchiseName) { loadTests(); return }
    if (!profile?.franchise_id) { setLoading(false); return }
    supabase.from('franchises').select('name').eq('id', profile.franchise_id).single()
      .then(({ data }) => {
        if (data?.name) setFranchiseName(data.name)
        else setLoading(false)
      })
  }, [profile])

  // Reload when tab becomes visible again (after customer takes test on QR code)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden && franchiseName) loadTests() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [franchiseName])

  async function loadTests() {
    setLoading(true)
    const since = new Date(Date.now() - 180 * 86400000).toISOString()
    const { data } = await supabasePublic
      .from('assessments')
      .select(IRON_TEST_SELECT)
      .eq('source', franchiseName)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    setTests(data || [])
    setLoading(false)
  }

  const { displayed, high, medium, low, chartData } = useMemo(() => {
    const days = PERIODS.find(p => p.key === period)?.days || 30
    const cutoff = Date.now() - days * 86400000
    const displayed = tests.filter(t => new Date(t.created_at) >= cutoff)
    return {
      displayed,
      high:   displayed.filter(t => t.risk_level?.toUpperCase() === 'HIGH').length,
      medium: displayed.filter(t => t.risk_level?.toUpperCase() === 'MEDIUM').length,
      low:    displayed.filter(t => t.risk_level?.toUpperCase() === 'LOW').length,
      chartData: buildChart(displayed, period),
    }
  }, [tests, period])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!franchiseName) return (
    <div className="px-4 py-20 text-center">
      <FlaskConical size={32} className="mx-auto mb-3 text-gray-300" />
      <p className="text-sm text-gray-400 font-body">Unable to load Iron Test data.<br/>Contact your administrator.</p>
    </div>
  )

  return (
    <div className="px-4 py-5 fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FlaskConical size={22} style={{ color: '#700000' }} />
          <h2 className="font-heading text-2xl font-semibold text-gray-800">Iron Tests</h2>
        </div>
        <button onClick={loadTests} className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <RefreshCw size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Period toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5 text-sm font-body font-semibold">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`flex-1 h-10 transition-colors ${period === p.key ? 'text-white' : 'text-gray-500 bg-white'}`}
            style={period === p.key ? { backgroundColor: '#700000' } : {}}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: 'Total',  value: displayed.length, cls: 'text-gray-800' },
          { label: 'High',   value: high,   cls: 'text-red-600' },
          { label: 'Medium', value: medium, cls: 'text-amber-500' },
          { label: 'Low',    value: low,    cls: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
            <p className={`font-heading text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 font-body">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {displayed.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
          <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">Tests Over Time</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={period === 'sixmon' ? 32 : 8}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'Montserrat', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                formatter={v => [v, 'Tests']}
                contentStyle={{ fontSize: 11, fontFamily: 'Montserrat', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? '#700000' : '#e5e7eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Customer list */}
      {displayed.length === 0 ? (
        <p className="text-sm text-gray-400 font-body text-center py-10">No tests in this period.</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">
            Customers ({displayed.length})
          </p>
          <div className="space-y-2">
            {displayed.map(t => {
              const rs = riskStyle(t.risk_level)
              return (
                <button key={t.id} onClick={() => setSelected(t)}
                  className="w-full text-left bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm border border-gray-100 active:scale-[0.99] transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-gray-800 truncate">{t.name || 'Anonymous'}</p>
                    <p className="text-[11px] text-gray-400 font-body">
                      {t.gender} · {t.age_range}
                      {t.mobile ? ` · ${t.mobile}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-300 font-body">{fmtDate(t.created_at)} {fmtTime(t.created_at)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold font-body px-2.5 py-1 rounded-full flex-shrink-0 ${rs.bg} ${rs.text}`}>
                    {rs.label}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {selected && <TestDetailModal test={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function TestDetailModal({ test, onClose }) {
  const rs = riskStyle(test.risk_level)
  const responses = test.responses || {}
  const severe = Object.entries(responses).filter(([, v]) => v === 2).map(([k]) => RESPONSE_LABELS[k] || k)
  const mild   = Object.entries(responses).filter(([, v]) => v === 1).map(([k]) => RESPONSE_LABELS[k] || k)

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-heading text-lg font-semibold text-gray-800">{test.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-400 font-body">
              {test.gender} · {test.age_range}
              {test.is_pregnant ? ` · Pregnant${test.trimester ? ` (${test.trimester})` : ''}` : ''}
            </p>
            {test.mobile && <p className="text-xs text-gray-400 font-body mt-0.5">{test.mobile}</p>}
            <p className="text-xs text-gray-300 font-body mt-0.5">{fmtDate(test.created_at)} at {fmtTime(test.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl mb-5 ${rs.bg}`}>
          <AlertTriangle size={16} className={rs.text} />
          <p className={`font-body font-bold text-sm ${rs.text}`}>{rs.label}</p>
          {test.total_score != null && (
            <p className={`text-xs font-body ml-auto ${rs.text} opacity-70`}>Score: {test.total_score}</p>
          )}
        </div>

        {severe.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-500 font-body uppercase tracking-wider mb-2">Severe</p>
            <div className="flex flex-wrap gap-2">
              {severe.map(s => (
                <span key={s} className="text-xs font-body font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-700">{s}</span>
              ))}
            </div>
          </div>
        )}

        {mild.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-amber-500 font-body uppercase tracking-wider mb-2">Mild</p>
            <div className="flex flex-wrap gap-2">
              {mild.map(s => (
                <span key={s} className="text-xs font-body px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">{s}</span>
              ))}
            </div>
          </div>
        )}

        {severe.length === 0 && mild.length === 0 && (
          <p className="text-sm text-green-600 font-body font-semibold text-center py-4">No significant symptoms reported.</p>
        )}

        <button onClick={onClose}
          className="w-full h-11 rounded-2xl text-white font-body font-semibold text-sm mt-2"
          style={{ backgroundColor: '#700000' }}>
          Close
        </button>
      </div>
    </div>
  )
}
