import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppWithBoundary } from './App.jsx'
import './App.css'
import { runMigrations } from './lib/migration.js'

runMigrations();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithBoundary />
  </React.StrictMode>,
)