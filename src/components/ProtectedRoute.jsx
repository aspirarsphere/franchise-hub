import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './Spinner'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their correct home
    if (profile.role === 'super_admin') return <Navigate to="/admin" replace />
    if (profile.role === 'franchise_owner') return <Navigate to="/owner" replace />
    return <Navigate to="/staff" replace />
  }

  return children
}
