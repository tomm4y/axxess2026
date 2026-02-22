import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router'
import HealthSafeLogin from './login.tsx'
import HealthSafeSignUp from './signup.tsx'
import Transcript from './transcript.tsx'
import Dashboard from './dashboard.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/login" element={<HealthSafeLogin/>}/>
        <Route path="/signup" element={<HealthSafeSignUp/>}/>
        <Route path="/transcript" element={<Transcript />}/>
        <Route path="/dashboard" element={<Dashboard />}/>
      </Routes>
    </StrictMode>
  </BrowserRouter>
)