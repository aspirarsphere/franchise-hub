import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { todayIST, formatTime } from '../../lib/utils'
import Spinner from '../../components/Spinner'
import { MapPin, Clock, Coffee } from 'lucide-react'

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getDuration(start, end) {
  if (!start) return '–'
  const mins = Math.floor((new Date(end || Date.now()) - new Date(start)) / 60000)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function getTotalWorked(sessions) {
  if (!sessions || sessions.length === 0) return '–'
  let total = 0
  sessions.forEach(s => {
    if (s.in && s.out) total += new Date(s.out) - new Date(s.in)
  })
  // Add current open session
  const open = sessions.find(s => s.in && !s.out)
  if (open) total += Date.now() - new Date(open.in)
  const mins = Math.floor(total / 60000)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function Attendance() {
  const { profile } = useAuth()
  const [attendance, setAttendance] = useState(null)
  const [franchise, setFranchise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [monthRecords, setMonthRecords] = useState([])
  const today = todayIST()

  useEffect(() => {
    if (!profile) return
    fetchAll()
  }, [profile])

  async function fetchAll() {
    const [attRes, locRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle(),
      supabase.from('franchise_locations').select('*').eq('franchise_id', profile.franchise_id).eq('status', 'active'),
      supabase.from('attendance').select('*').eq('user_id', profile.id)
        .gte('date', today.slice(0, 8) + '01').order('date', { ascending: false })
    ])
    setAttendance(attRes.data)
    setFranchise({ locations: locRes.data || [] })
    setMonthRecords(monthRes.data || [])
    setLoading(false)
  }

  async function getLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, enableHighAccuracy: true }
      )
    })
  }

  async function checkLocation() {
    setError('')
    const loc = await getLocation()
    if (!loc) {
      setError('Could not get your location. Please enable GPS and try again.')
      return null
    }
    const activeLocations = franchise?.locations || []
    if (activeLocations.length > 0) {
      const nearest = activeLocations.reduce((best, l) => {
        const dist = getDistanceMeters(loc.lat, loc.lng, l.lat, l.lng)
        return (!best || dist < best.dist) ? { ...l, dist } : best
      }, null)
      if (nearest && nearest.dist > (nearest.radius_meters || 200)) {
        setError(`You are ${Math.round(nearest.dist)}m away from the outlet. Must be within ${nearest.radius_meters || 200}m. Please go to the outlet location.`)
        return null
      }
    }
    return loc
  }

  async function clockIn() {
    setActionLoading(true)
    const loc = await checkLocation()
    if (!loc) { setActionLoading(false); return }

    const now = new Date().toISOString()
    const sessions = [{ in: now, out: null }]

    const { error: err } = await supabase.from('attendance').insert({
      user_id: profile.id,
      franchise_id: profile.franchise_id,
      date: today,
      clock_in_time: now,
      gps_lat_in: loc.lat,
      gps_lng_in: loc.lng,
      sessions,
    })

    setActionLoading(false)
    if (err) { setError('Could not record attendance: ' + err.message); return }
    fetchAll()
  }

  async function startBreak() {
    setActionLoading(true)
    const loc = await checkLocation()
    if (!loc) { setActionLoading(false); return }

    const now = new Date().toISOString()
    const sessions = [...(attendance.sessions || [])]
    const openIdx = sessions.findIndex(s => s.in && !s.out)
    if (openIdx >= 0) sessions[openIdx].out = now

    const { error: err } = await supabase.from('attendance')
      .update({ sessions })
      .eq('id', attendance.id)

    setActionLoading(false)
    if (err) { setError('Error: ' + err.message); return }
    fetchAll()
  }

  async function endBreak() {
    setActionLoading(true)
    const loc = await checkLocation()
    if (!loc) { setActionLoading(false); return }

    const now = new Date().toISOString()
    const sessions = [...(attendance.sessions || []), { in: now, out: null }]

    const { error: err } = await supabase.from('attendance')
      .update({ sessions })
      .eq('id', attendance.id)

    setActionLoading(false)
    if (err) { setError('Error: ' + err.message); return }
    fetchAll()
  }

  async function clockOut() {
    setActionLoading(true)
    const loc = await checkLocation()
    if (!loc) { setActionLoading(false); return }

    const now = new Date().toISOString()
    const sessions = [...(attendance.sessions || [])]
    const openIdx = sessions.findIndex(s => s.in && !s.out)
    if (openIdx >= 0) sessions[openIdx].out = now

    const { error: err } = await supabase.from('attendance')
      .update({ clock_out_time: now, sessions })
      .eq('id', attendance.id)

    setActionLoading(false)
    if (err) { setError('Error: ' + err.message); return }
    fetchAll()
  }

  const sessions = attendance?.sessions || []
  const hasOpenSession = sessions.some(s => s.in && !s.out)
  const isClockedIn = !!attendance?.clock_in_time
  const isClockedOut = !!attendance?.clock_out_time
  const isOnBreak = isClockedIn && !isClockedOut && !hasOpenSession
  const breakCount = sessions.filter(s => s.in && s.out).length

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="px-4 py-6 fade-in">
      <h2 className="font-heading text-2xl font-semibold text-gray-800 mb-6">Attendance</h2>

      {/* Today card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: '#9c7738' }} />
          <p className="text-xs font-semibold text-gray-500 font-body uppercase tracking-wider">
            Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
          </p>
        </div>

        {isClockedIn && (
          <div className="grid grid-cols-3 gap-3 mb-5 text-center">
            <div>
              <p className="text-[11px] text-gray-400 font-body uppercase tracking-wide mb-1">Clock In</p>
              <p className="font-heading font-semibold text-base text-green-600">{formatTime(attendance.clock_in_time)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-body uppercase tracking-wide mb-1">Clock Out</p>
              <p className="font-heading font-semibold text-base text-gray-700">
                {attendance.clock_out_time ? formatTime(attendance.clock_out_time) : '–'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-body uppercase tracking-wide mb-1">Worked</p>
              <p className="font-heading font-semibold text-base" style={{ color: '#700000' }}>
                {getTotalWorked(sessions)}
              </p>
            </div>
          </div>
        )}

        {/* Sessions breakdown */}
        {sessions.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-body bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">Session {i + 1}</span>
                <span className="text-gray-700 font-medium">
                  {formatTime(s.in)} → {s.out ? formatTime(s.out) : <span className="text-green-600">Active</span>}
                </span>
                <span className="text-gray-400">{s.out ? getDuration(s.in, s.out) : 'ongoing'}</span>
              </div>
            ))}
            {breakCount > 0 && (
              <p className="text-xs text-amber-600 font-body font-medium px-1">
                {breakCount} break{breakCount > 1 ? 's' : ''} taken
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm font-body flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!isClockedIn && (
          <button onClick={clockIn} disabled={actionLoading}
            className="w-full h-14 rounded-2xl font-body font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#700000' }}>
            {actionLoading ? <Spinner size={24} /> : <><Clock size={20} /> Clock In</>}
          </button>
        )}

        {isClockedIn && !isClockedOut && hasOpenSession && (
          <div className="flex gap-3">
            <button onClick={startBreak} disabled={actionLoading}
              className="flex-1 h-12 rounded-xl border-2 font-body font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ borderColor: '#9c7738', color: '#9c7738' }}>
              {actionLoading ? <Spinner size={20} /> : <><Coffee size={16} /> Break</>}
            </button>
            <button onClick={clockOut} disabled={actionLoading}
              className="flex-1 h-12 rounded-xl border-2 font-body font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ borderColor: '#700000', color: '#700000' }}>
              {actionLoading ? <Spinner size={20} /> : <><Clock size={16} /> Clock Out</>}
            </button>
          </div>
        )}

        {isClockedIn && !isClockedOut && isOnBreak && (
          <button onClick={endBreak} disabled={actionLoading}
            className="w-full h-14 rounded-2xl font-body font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#9c7738' }}>
            {actionLoading ? <Spinner size={24} /> : <><Coffee size={20} /> End Break & Resume</>}
          </button>
        )}

        {isClockedOut && (
          <div className="text-center py-2">
            <p className="text-green-600 font-body font-semibold text-sm">✓ Attendance complete for today</p>
            <p className="text-xs text-gray-400 font-body mt-1">Total worked: {getTotalWorked(sessions)}</p>
          </div>
        )}
      </div>

      {/* Month records */}
      <p className="text-xs font-semibold text-gray-400 font-body uppercase tracking-wider mb-3">This Month</p>
      {monthRecords.length === 0 ? (
        <p className="text-sm text-gray-400 font-body text-center py-8">No records yet this month</p>
      ) : (
        <div className="space-y-2">
          {monthRecords.map(r => (
            <div key={r.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-gray-100">
              <div>
                <p className="text-sm font-body font-medium text-gray-700">
                  {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                </p>
                <p className="text-xs text-gray-400 font-body mt-0.5">
                  {r.clock_in_time ? formatTime(r.clock_in_time) : '–'} → {r.clock_out_time ? formatTime(r.clock_out_time) : 'No clock-out'}
                </p>
                {r.sessions?.length > 1 && (
                  <p className="text-[10px] text-amber-500 font-body">{r.sessions.length - 1} break{r.sessions.length > 2 ? 's' : ''}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-semibold font-body ${r.clock_in_time ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {r.clock_in_time ? 'Present' : 'Absent'}
                </span>
                <p className="text-xs text-gray-400 font-body mt-1">{getTotalWorked(r.sessions)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
