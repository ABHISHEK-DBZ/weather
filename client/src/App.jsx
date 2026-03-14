import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppScene from './components/AppScene'
import AdminDashboard from './pages/AdminDashboard'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppScene />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
