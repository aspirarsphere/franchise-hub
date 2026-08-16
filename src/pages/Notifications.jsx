import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { Bell, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatIST } from '../lib/utils'

const TYPE_ICONS = {
  stock_alert: '📦',
  attendance: '🕐',
  restock: '🔄',
  sale: '🛒',
  summary: '📊',
  broadcast: '📢',
}

export default function Notifications() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadNotifications()
  }, [profile])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
    // Mark all as read
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-maroon text-white px-4 h-14 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-heading text-lg font-semibold">Notifications</h2>
      </div>

      <div className="px-4 py-5">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="All clear!" message="You have no notifications yet." />
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left rounded-2xl px-4 py-3 shadow-sm border transition-all ${n.is_read ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 font-body mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-gray-400 font-body mt-1.5">
                      {formatIST(n.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" style={{ backgroundColor: '#9c7738' }} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
