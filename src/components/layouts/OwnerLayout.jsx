import { Outlet } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, BarChart3, Settings, Home, Clock } from 'lucide-react'
import TopBar from '../TopBar'
import BottomNav from '../BottomNav'
import { useAuth } from '../../context/AuthContext'

const OWNER_TABS = [
  { to: '/owner', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/owner/inventory', icon: Package, label: 'Stock' },
  { to: '/owner/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/owner/settings', icon: Settings, label: 'Settings' },
]

const STAFF_TABS = [
  { to: '/staff', icon: Home, label: 'Home' },
  { to: '/staff/sale', icon: ShoppingCart, label: 'New Sale' },
  { to: '/staff/attendance', icon: Clock, label: 'Attendance' },
]

export default function OwnerLayout() {
  const { staffMode } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <TopBar title={staffMode ? 'Staff' : 'Outlet'} />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav tabs={staffMode ? STAFF_TABS : OWNER_TABS} />
    </div>
  )
}
