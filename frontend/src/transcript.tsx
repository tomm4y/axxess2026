import { LucideAArrowDown, LucideMic } from 'lucide-react';
import React from 'react';

// Define props here if you plan to pass data later (e.g., sessionId, doctorName)
interface TranscriptProps {
  // Example: sessionId?: string;
}

const Transcript: React.FC<TranscriptProps> = () => {
  return (
    // Mobile container simulation
    <div className="max-w-md w-full mx-auto bg-white relative overflow-hidden flex flex-col font-sans sm:rounded-3xl">
      
      {/* Decorative Background Blobs */}
      <img src='/Circle.svg' className='w-50 h-50 absolute -right-20 top-1/2 -translate-y-1/2'/>
      <img src='/Circle.svg' className='w-60 h-60 absolute -left-25 bottom-20'/>

      {/* Header */}
      <header className="fixed w-full bg-gradient-to-r flex py-4 items-end to-[#E73A8A] from-[#ED385A] px-4 z-20">
        <div className="flex mt-2 h-full text-white text-2xl font-semibold w-40">
          <img src='/Logo.svg'/>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col overflow-y-auto mt-15 px-5 pt-4 pb-16 relative z-10 items-center justify-center">
        
        {/* Session Title */}
        <h1 className="text-[#E73A5B] text-xl font-sf-semibold mb-6 flex w-full items-start">
          Session 12345
        </h1>

        {/* Doctor Profile Card */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#FBE4EE] rounded-2xl p-4 w-44 flex flex-col items-center shadow-sm">
            <img 
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&h=200&auto=format&fit=crop" 
              alt="Dr. X" 
              className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-white shadow-sm"
            />
            <span className="text-gray-800 font-sf-semibold">Dr. X</span>
          </div>
        </div>

        {/* Transcription Section */}
        <div className="mb-4 w-full ">
          <h2 className="text-black font-sf-semibold text-md mb-2 items-start w-full flex">Transcription</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] p-4 h-[250px] relative z-10">
            <p className="text-gray-700 text-sm leading-relaxed tracking-widest break-all">

            </p>
          </div>
        </div>

        {/* Transcription Section */}
        <div className="h-[75px] w-[75px] flex bg-[#ED3E52] rounded-full items-center justify-center">
          <LucideMic color='white' size={30}/>
        </div>
      </main>

    </div>
  );
};

export default Transcript;