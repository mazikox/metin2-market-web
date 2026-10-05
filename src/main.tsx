import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AdminStats from './AdminStats'
import AdminScans from './AdminScans'
import ServerLanding from './ServerLanding'
import { hasSelectedServer } from './servers'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, '') === '/admin/stats'
      ? <AdminStats />
      : window.location.pathname.replace(/\/$/, '') === '/admin/scans' ? <AdminScans />
      : hasSelectedServer() ? <App /> : <ServerLanding />}
  </StrictMode>,
)
