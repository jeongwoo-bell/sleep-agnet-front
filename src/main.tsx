import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { initTheme } from './lib/theme'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import App from './App.tsx'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGuard>
          <App />
        </AuthGuard>
      </AuthProvider>
    </BrowserRouter>
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '13px',
        },
        classNames: {
          success: '',
          error: '',
          description: '',
        },
      }}
      theme="system"
      icons={{
        success: <span style={{ color: '#10b981', fontSize: '15px' }}>&#10003;</span>,
        error: <span style={{ color: '#f87171', fontSize: '15px' }}>&#10007;</span>,
      }}
    />
  </StrictMode>,
)
