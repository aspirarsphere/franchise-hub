import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { FullPageSpinner } from './components/Spinner'
import ProtectedRoute from './components/ProtectedRoute'

// Layouts
import StaffLayout from './components/layouts/StaffLayout'
import OwnerLayout from './components/layouts/OwnerLayout'
import AdminLayout from './components/layouts/AdminLayout'

// Auth
import Login from './pages/auth/Login'
import ResetPassword from './pages/auth/ResetPassword'

// Staff pages
import StaffHome from './pages/staff/StaffHome'
import NewSale from './pages/staff/NewSale'
import Attendance from './pages/staff/Attendance'
import VRRegistration from './pages/staff/VRRegistration'

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard'
import SalesList from './pages/owner/SalesList'
import Inventory from './pages/owner/Inventory'
import Team from './pages/owner/Team'
import OwnerAttendance from './pages/owner/OwnerAttendance'
import OwnerAnalytics from './pages/owner/OwnerAnalytics'
import OwnerSettings from './pages/owner/OwnerSettings'

// Admin pages
import AdminOverview from './pages/admin/AdminOverview'
import Franchises from './pages/admin/Franchises'
import Analytics from './pages/admin/Analytics'
import AdminSettings from './pages/admin/AdminSettings'
import Restock from './pages/admin/Restock'
import HQTeam from './pages/admin/HQTeam'
import HQInventory from './pages/admin/HQInventory'

// Shared
import Notifications from './pages/Notifications'

function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'super_admin') return <Navigate to="/admin" replace />
  if (profile.role === 'franchise_owner') return <Navigate to="/owner" replace />
  return <Navigate to="/staff" replace />
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <FullPageSpinner />

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Staff */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['staff', 'franchise_owner', 'super_admin']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<StaffHome />} />
        <Route path="sale" element={<NewSale />} />
        <Route path="vr" element={<VRRegistration />} />
        <Route path="attendance" element={<Attendance />} />
      </Route>

      {/* Owner */}
      <Route path="/owner" element={
        <ProtectedRoute allowedRoles={['franchise_owner', 'super_admin']}>
          <OwnerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<OwnerDashboard />} />
        <Route path="sales" element={<SalesList />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="team" element={<Team />} />
        <Route path="attendance" element={<OwnerAttendance />} />
        <Route path="analytics" element={<OwnerAnalytics />} />
        <Route path="settings" element={<OwnerSettings />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminOverview />} />
        <Route path="franchises" element={<Franchises />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="restock" element={<Restock />} />
        <Route path="team" element={<HQTeam />} />
        <Route path="inventory" element={<HQInventory />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Shared */}
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
