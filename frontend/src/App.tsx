import { BrowserRouter, Routes, Route, Link } from 'react-router'
import './App.css'
import HealthSafeLogin from './login'
import HealthSafeSignUp from './signup'

function LandingPage() {
  return (
    <div>
      <div className='fixed inset-0'>
        <img src='/WaveBG.svg' className='top-0 fixed w-full'/>
        <img src='/BottomWaveBG.svg' className='bottom-0 fixed w-full'/>
      </div>
      <div className='fixed w-full h-full flex flex-col items-center top-[10%]'>
        <h1 className='font-sf-regular text-white text-3xl flex justify-center items-center'>
          Welcome To
        </h1>
        <img className="w-[70%]" src='/Logo.svg'/>
      </div>
      <div className='fixed bottom-[15%] w-full flex flex-col items-center gap-4 px-8'>
        <Link
          to="/login"
          className='w-full max-w-sm py-4 text-center rounded-full font-bold text-white text-lg'
          style={{
            background: 'linear-gradient(135deg, #ff4d7d, #e91e8c)',
            boxShadow: '0 8px 24px rgba(233,30,140,0.35)',
          }}
        >
          Login
        </Link>
        <Link
          to="/signup"
          className='w-full max-w-sm py-4 text-center rounded-full font-bold text-lg'
          style={{
            background: 'white',
            color: '#e91e8c',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          Create Account
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<HealthSafeLogin />} />
        <Route path="/signup" element={<HealthSafeSignUp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
