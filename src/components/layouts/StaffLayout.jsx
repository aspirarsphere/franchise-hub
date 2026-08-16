import { Outlet } from 'react-router-dom'
import { Home, ShoppingCart, Clock } from 'lucide-react'
import TopBar from '../TopBar'
import BottomNav from '../BottomNav'

const TABS = [
  { to: '/staff', icon: Home, label: 'Home' },
  { to: '/staff/sale', icon: ShoppingCart, label: 'New Sale' },
  { to: '/staff/attendance', icon: Clock, label: 'Attendance' },
]

export default function StaffLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <TopBar title="Staff" />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav tabs={TABS} />
    </div>
  )
}
