import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — it handles it automatically
    // via onAuthStateChange PASSWORD_RECOVERY event, but we just need the session to exist
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6">
      <img src="/logo.svg" alt="VeaChoc" className="h-24 w-auto mb-6" />
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-heading text-xl font-semibold text-gray-800 mb-1">Reset Password</h2>
        <p className="text-sm text-gray-400 font-body mb-5">Enter your new password below.</p>

        {done ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-body font-semibold">✓ Password updated! Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
              required
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none"
              required
            />
            {error && <p className="text-red-500 text-sm font-body">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white font-body font-semibold text-sm"
              style={{ backgroundColor: '#700000' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
