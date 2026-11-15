import React from 'react'
import ReactDOM from 'react-dom/client'
import { Agentation } from 'agentation'
import App from './App'
import './index.css'
import { applyConfigToDOM } from './config/appConfig'

// Инициализация токенов, геометрии и глобального конфига в DOM
applyConfigToDOM()

// PWA: регистрируем service worker в production-сборке
if (
  'serviceWorker' in navigator &&
  (import.meta.env.PROD || process.env.NODE_ENV === 'production')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Не удалось зарегистрировать service worker:', err)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
  </React.StrictMode>
)
