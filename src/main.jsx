import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

// Auto-reload when a new deployment is detected
let deployedVersion = null
async function checkVersion() {
  try {
    const res = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) return
    const { v } = await res.json()
    if (deployedVersion === null) { deployedVersion = v; return }
    if (v !== deployedVersion) window.location.reload()
  } catch {}
}
checkVersion()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkVersion()
})

// Also reload when the service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
