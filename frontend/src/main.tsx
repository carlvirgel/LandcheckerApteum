import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createQueryClient } from './lib/queryClient'
import './index.css'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App queryClient={queryClient} />
  </StrictMode>,
)
