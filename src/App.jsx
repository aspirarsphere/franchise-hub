import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { FullPageSpinner } from './components/Spinner'
import ProtectedRoute from './components/ProtectedRoute'

// Layouts (loaded eagerly — needed immediately for all routes)
import StaffLayout from './components/layouts/StaffLayout'
import OwnerLayout from './components/layouts/OwnerLayout'
import AdminLayout from './components/layouts/AdminLayout'

// Auth
const Login = lazy(() => import('./pages/auth/Login'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

// Staff pages
const StaffHome = lazy(() => import('./pages/staff/StaffHome'))
const NewSale = lazy(() => import('./pages/staff/NewSale'))
const Attendance = lazy(() => import('./pages/staff/Attendance'))
const VRRegistration = lazy(() => import('./pages/staff/VRRegistration'))

// Owner pages
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'))
const SalesList = lazy(() => import('./pages/owner/SalesList'))
const Inventory = lazy(() => import('./pages/owner/Inventory'))
const Team = lazy(() => import('./pages/owner/Team'))
const OwnerAttendance = lazy(() => import('./pages/owner/OwnerAttendance'))
const OwnerAnalytics = lazy(() => import('./pages/owner/OwnerAnalytics'))
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'))

// Admin pages
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const Franchises = lazy(() => import('./pages/admin/Franchises'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const Restock = lazy(() => import('./pages/admin/Restock'))
const HQTeam = lazy(() => import('./pages/admin/HQTeam'))
const HQInventory = lazy(() => import('./pages/admin/HQInventory'))

// Shared
const Notifications = lazy(() => import('./pages/Notifications'))

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
    <Suspense fallback={<FullPageSpinner />}>
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
    </Suspense>
  )
}
