export const RESPONSE_LABELS = {
  'breath':             'Breathlessness',
  'fatigue':            'Fatigue',
  'appetite':           'Appetite',
  'headaches':          'Headaches',
  'adult-mood':         'Mood',
  'infections':         'Frequent infections',
  'skin-nails':         'Skin & nails',
  'adult-history':      'Family history',
  'concentration':      'Concentration',
  'cold-extremities':   'Cold hands/feet',
  'adult-palpitations': 'Palpitations',
  'deworming':          'Deworming',
  'cravings':           'Unusual cravings',
  'pregnancy-energy':   'Energy (pregnancy)',
  'dark-circles':       'Dark circles',
  'swelling':           'Swelling',
  'hair-loss':          'Hair loss',
}

export const RISK_STYLE = {
  HIGH:   { bg: 'bg-red-100',   text: 'text-red-700',   label: 'High Risk' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium Risk' },
  LOW:    { bg: 'bg-green-100', text: 'text-green-700', label: 'Low Risk' },
}

export function riskStyle(level) {
  return RISK_STYLE[level?.toUpperCase()] || { bg: 'bg-gray-100', text: 'text-gray-600', label: level || '–' }
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}
export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

export const IRON_TEST_SELECT = 'id, created_at, name, gender, age_range, is_pregnant, trimester, risk_level, total_score, responses, mobile'
