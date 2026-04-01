import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// ローカル開発時はlocalhost、本番はEBのURLを使用
axios.defaults.baseURL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : import.meta.env.VITE_API_BASE_URL

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
