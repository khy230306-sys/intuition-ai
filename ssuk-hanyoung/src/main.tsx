import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const redirect = sessionStorage.getItem('ssuk-redirect')
if (redirect) {
  sessionStorage.removeItem('ssuk-redirect')
  try {
    history.replaceState(null, '', redirect)
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
