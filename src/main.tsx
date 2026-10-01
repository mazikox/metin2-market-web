import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AdminStats from './AdminStats'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, '') === '/admin/stats' ? <AdminStats /> : <App />}
  </StrictMode>,
)
