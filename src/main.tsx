import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { startAnalytics } from './lib/analytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Aggregate, cookieless page counts only, and only if the owner supplied a
// beacon token at build time. With no token this does nothing at all.
startAnalytics()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The online shop and owner workspace remain usable if the optional PWA worker cannot register.
    })
  })
}
