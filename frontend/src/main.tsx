import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// 本番環境では環境変数のURLを使用、なければlocalhost
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
