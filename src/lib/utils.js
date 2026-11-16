// Format currency as Indian Rupees
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN')
}

// Format date/time in IST
export function formatIST(dateStr, opts = {}) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...opts
  })
}

export function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function nowIST() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T')
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// Generate invoice number — timestamp-based to avoid duplicate key conflicts
export function generateInvoiceNo(franchiseCode) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(1000 + Math.floor(Math.random() * 9000))
  return `VC-${franchiseCode || 'HQ'}-${y}${m}${d}-${rand}`
}

// Truncate text
export function truncate(str, n = 30) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}
