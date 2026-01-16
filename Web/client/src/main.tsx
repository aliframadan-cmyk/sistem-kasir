import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// PENTING: Import CSS ini agar Tailwind jalan
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)