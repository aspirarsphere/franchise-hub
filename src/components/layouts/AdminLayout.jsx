import { Outlet } from 'react-router-dom'
import { Globe, Store, BarChart3, Settings, Package, Users } from 'lucide-react'
import TopBar from '../TopBar'
import BottomNav from '../BottomNav'

const TABS = [
  { to: '/admin', icon: Globe, label: 'Overview' },
  { to: '/admin/franchises', icon: Store, label: 'Franchises' },
  { to: '/admin/team', icon: Users, label: 'Team' },
  { to: '/admin/restock', icon: Package, label: 'Restock' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <TopBar title="HQ" />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav tabs={TABS} />
    </div>
  )
}
