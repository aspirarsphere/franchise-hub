import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'

export default function Login() {
  const [mode, setMode] = useState('password') // 'password' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpStep, setOtpStep] = useState('phone') // 'phone' | 'otp'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  async function redirectByRole(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile) {
      setError('Your account is not set up yet. Please contact VeaChoc HQ.')
      await supabase.auth.signOut()
      return
    }

    if (profile.role === 'super_admin') navigate('/admin', { replace: true })
    else if (profile.role === 'franchise_owner') navigate('/owner', { replace: true })
    else navigate('/staff', { replace: true })
  }

  // --- Email + Password ---
  async function signInWithPassword() {
    setError('')
    if (!email.trim()) { setError('Please enter your email.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setLoading(false)
      setError('Incorrect email or password. Please try again.')
      return
    }
    await redirectByRole(data.user.id)
    setLoading(false)
  }

  // --- Phone OTP ---
  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('91') && digits.length === 12) return '+' + digits
    if (digits.length === 10) return '+91' + digits
    return '+' + digits
  }

  async function sendOTP() {
    setError('')
    const formatted = formatPhone(phone)
    if (formatted.length < 12) { setError('Please enter a valid 10-digit mobile number.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (err) { setError('Could not send OTP. Please try again.'); return }
    setOtpStep('otp')
  }

  async function verifyOTP() {
    setError('')
    if (otp.length < 4) { setError('Please enter the OTP you received.'); return }
    setLoading(true)
    const formatted = formatPhone(phone)
    const { data, error: err } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })
    if (err) { setLoading(false); setError('Invalid OTP. Please check and try again.'); return }
    await redirectByRole(data.user.id)
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setOtpStep('phone')
    setOtp('')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FDFBF7' }}>
      {/* Header */}
      <div className="text-white px-6 pt-14 pb-12 flex flex-col items-start" style={{ backgroundColor: '#700000' }}>
        <img src="/logo.svg" alt="VeaChoc" className="h-24 w-auto mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
        <p className="text-white/70 font-body text-sm tracking-wide">Franchise Hub</p>
        <p className="text-white/50 font-body text-xs mt-1">by Aspirar Sphere Pvt. Ltd.</p>
      </div>

      <div className="flex-1 px-5 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 fade-in">

          {/* Mode toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchMode('password')}
              className={`flex-1 h-9 rounded-lg text-xs font-body font-semibold transition-all ${mode === 'password' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
            >
              Email & Password
            </button>
            <button
              onClick={() => switchMode('otp')}
              className={`flex-1 h-9 rounded-lg text-xs font-body font-semibold transition-all ${mode === 'otp' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
            >
              Phone OTP
            </button>
          </div>

          {/* EMAIL + PASSWORD */}
          {mode === 'password' && (
            <>
              <h2 className="font-heading text-xl font-semibold text-gray-800 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-500 font-body mb-5">Sign in with your email and password</p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-sm focus:outline-none transition-all"
                    style={{ '--tw-ring-color': '#700000' }}
                    onKeyDown={e => e.key === 'Enter' && signInWithPassword()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-12 px-4 pr-12 border border-gray-200 rounded-xl font-body text-sm focus:outline-none transition-all"
                      onKeyDown={e => e.key === 'Enter' && signInWithPassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-body px-1"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm font-body mb-4 fade-in">{error}</p>}

              <button
                onClick={signInWithPassword}
                disabled={loading || !email || !password}
                className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}
              >
                {loading ? <Spinner size={20} /> : 'Sign In →'}
              </button>
            </>
          )}

          {/* PHONE OTP */}
          {mode === 'otp' && otpStep === 'phone' && (
            <>
              <h2 className="font-heading text-xl font-semibold text-gray-800 mb-1">Phone Login</h2>
              <p className="text-sm text-gray-500 font-body mb-5">Enter your registered mobile number</p>

              <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">Mobile Number</label>
              <div className="flex gap-2 mb-4">
                <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-body text-gray-600 font-medium">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="flex-1 h-12 px-4 border border-gray-200 rounded-xl font-body text-base focus:outline-none transition-all"
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                />
              </div>

              {error && <p className="text-red-500 text-sm font-body mb-4 fade-in">{error}</p>}

              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}
              >
                {loading ? <Spinner size={20} /> : 'Send OTP →'}
              </button>
            </>
          )}

          {mode === 'otp' && otpStep === 'otp' && (
            <>
              <button onClick={() => { setOtpStep('phone'); setOtp(''); setError('') }}
                className="text-sm font-body font-medium mb-4 flex items-center gap-1" style={{ color: '#9c7738' }}>
                ← Change number
              </button>
              <h2 className="font-heading text-xl font-semibold text-gray-800 mb-1">Verify OTP</h2>
              <p className="text-sm text-gray-500 font-body mb-5">Sent to +91 {phone}</p>

              <label className="block text-xs font-semibold text-gray-500 font-body uppercase tracking-wider mb-1.5">One-Time Password</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter OTP"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl font-body text-base text-center tracking-[0.3em] text-lg font-semibold focus:outline-none transition-all mb-4"
                onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                autoFocus
              />

              {error && <p className="text-red-500 text-sm font-body mb-4 fade-in">{error}</p>}

              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 4}
                className="w-full h-12 rounded-xl font-body font-semibold text-white text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                style={{ backgroundColor: '#700000' }}
              >
                {loading ? <Spinner size={20} /> : 'Verify & Sign In →'}
              </button>

              <button onClick={sendOTP} disabled={loading}
                className="w-full mt-3 text-center text-sm text-gray-400 font-body hover:text-gold transition-colors">
                Resend OTP
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 font-body mt-6 pb-8">
          An Anaemia-Free India through Joyful Nutrition
        </p>
      </div>
    </div>
  )
}
