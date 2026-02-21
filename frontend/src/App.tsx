import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <div className='fixed inset-0' >
        <img src='/WaveBG.svg' className='top-0 fixed w-full'/>
        <img src='/BottomWaveBG.svg' className='bottom-0 fixed w-full'/>
      </div>
      <div className='fixed w-full h-full flex flex-col items-center top-[10%]'>
        <h1 className='font-sf-regular text-white text-3xl flex justify-center items-center'>
          Welcome To
        </h1>
        <img className=" w-[70%]" src='/Logo.svg'/>
      </div>
      <div className='fixed bottom-[20%]'>
        Hello
      </div>
    </div>
  )
}

export default App
