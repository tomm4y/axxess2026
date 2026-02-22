import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router'
import HealthSafeLogin from './login.tsx'
import HealthSafeSignUp from './signup.tsx'
import Transcript from './transcript.tsx'
import Dashboard from './dashboard.tsx'
import HealthSafeNavbar from './components/HealthSafeNavbar.tsx'
import { ProtectedRoute, PublicRoute } from './components/RouteGuards.tsx'
import AuthProvider from './lib/AuthContext.tsx'
import { StrictMode, useState, useEffect } from 'react'

// Layout component that wraps navbar around all child routes
const NavbarLayout = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ display: "contents" }}>
      <HealthSafeNavbar />
      <div style={{ paddingBottom: isDesktop ? 0 : "70px" }}>
        <Outlet />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App/>}/>
          {/* Public-only routes: redirect to /dashboard if already logged in */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<HealthSafeLogin/>}/>
            <Route path="/signup" element={<HealthSafeSignUp/>}/>
          </Route>
          {/* Protected routes: redirect to /login if not logged in */}
          <Route element={<ProtectedRoute />}>
            <Route element={<NavbarLayout />}>
              <Route path="/transcript" element={<Transcript />}/>
              <Route path="/dashboard" element={<Dashboard />}/>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </StrictMode>
  </BrowserRouter>
)