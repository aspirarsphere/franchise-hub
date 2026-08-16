import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatINR, formatIST } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { ShoppingCart } from 'lucide-react'

export default function SalesList() {
  const { profile } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today')

  useEffect(() => {
    if (!profile?.franchise_id) return
    loadSales()
  }, [profile, filter])

  async function loadSales() {
    setLoading(true)
    let from
    const now = new Date()
    if (filter === 'today') {
      from = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30').toISOString()
    } else if (filter === 'week') {
      from = new Date(Date.now() - 6 * 86400000).toISOString()
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }

    const { data } = await supabase
      .from('sales')
      .select('*, profiles(full_name)')
      .eq('franchise_id', profile.franchise_id)
      .gte('created_at', from)
      .order('created_at', { ascending: false })

    setSales(data || [])
    setLoading(false)
  }

  const total = sales.reduce((s, r) => s + (r.total || 0), 0)

  return (
    <div className="px-4 py-5 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-4">Sales</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['today', 'week', 'month'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 h-9 rounded-xl text-xs font-body font-semibold capitalize transition-all ${filter === f ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
            style={filter === f ? { backgroundColor: '#700000' } : {}}
          >
            {f === 'today' ? 'Today' : f === 'week' ? '7 Days' : 'Month'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex justify-between">
        <div>
          <p className="text-xs text-gray-400 font-body">Total Sales</p>
          <p className="font-heading text-2xl font-bold" style={{ color: '#9c7738' }}>{formatINR(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-body">Count</p>
          <p className="font-heading text-2xl font-bold text-gray-800">{sales.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : sales.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No sales yet" message="Sales for this period will appear here." />
      ) : (
        <div className="space-y-2">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-body font-semibold text-gray-800">{sale.customer_name}</p>
                  <p className="text-xs text-gray-400 font-body">{sale.invoice_number} · {sale.profiles?.full_name}</p>
                  <p className="text-xs text-gray-400 font-body mt-0.5">
                    {formatIST(sale.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-body font-bold text-sm" style={{ color: '#700000' }}>{formatINR(sale.total)}</p>
                  <span className="text-[10px] text-gray-400 font-body">{sale.payment_mode}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
