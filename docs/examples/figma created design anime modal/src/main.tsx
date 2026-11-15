import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Agentation } from 'agentation'

const isDev = import.meta.env.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {isDev && <Agentation endpoint="http://localhost:4747" />}
  </React.StrictMode>,
)

