import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function TopBar({ title }) {
  const { profile, signOut, staffMode, setStaffMode } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setUnread(count || 0))
  }, [profile])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isOwnerInStaffMode = profile?.role === 'franchise_owner' && staffMode

  return (
    <header className="sticky top-0 z-40 shadow-md" style={{ backgroundColor: '#700000' }}>
      {isOwnerInStaffMode && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-500">
          <span className="text-xs font-body font-semibold text-white tracking-wide">
            Staff Mode — actions saved to your account
          </span>
          <button
            onClick={() => { setStaffMode(false); navigate('/owner') }}
            className="text-xs font-body font-bold text-white underline underline-offset-2"
          >
            Exit
          </button>
        </div>
      )}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="VeaChoc" className="h-12 w-auto" />
          {title && <span className="text-white/70 text-sm font-body">· {title}</span>}
        </div>
        <div className="flex items-center gap-1">
          {profile?.role === 'franchise_owner' && !staffMode && (
            <button
              onClick={() => { setStaffMode(true); navigate('/staff') }}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-body font-semibold border border-white/30 text-white/90 hover:bg-white/10 transition-colors mr-1"
              title="Switch to Staff View"
            >
              <ArrowLeftRight size={12} />
              Staff View
            </button>
          )}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-white" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" style={{ backgroundColor: '#9c7738' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={20} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  )
}
