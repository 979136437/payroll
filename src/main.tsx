import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initVConsole } from '@/shared/lib/vconsole'

if (import.meta.env.DEV) {
  void initVConsole({
    isDev: true,
    loadVConsole: async () => {
      const module = await import("vconsole")
      return module.default
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
