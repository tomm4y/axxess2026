import { LucideQrCode, LucideUser, LucideX } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentUser } from './lib/api';
import QRCode from 'qrcode';

interface Person {
  id: string;
  name: string;
  specialty?: string;
  imageUrl?: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  is_clinician: boolean;
}

const generateQRCodeFromUid = async (doctorUid: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(doctorUid, {
      width: 256,
      margin: 2,
      color: { dark: '#E73A5B', light: '#FFFFFF' }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw error;
  }
};

// ─── Dashboard Component ──────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // User state - to determine if clinician or patient
  const [user, setUser] = useState<UserData | null>(null);
  const [isClinician, setIsClinician] = useState(false);
  
  const [persons, _setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  
  // QR Code modal state (for clinicians)
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const response = await getCurrentUser();
        if (response?.user) {
          setUser(response.user);
          setIsClinician(response.user.is_clinician);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndData();
  }, []);

  const handleScanQRCode = () => {
    setScanning(true);
    alert('QR Scanner will be integrated here.');
    setScanning(false);
  };

  const handleShowQRCode = async () => {
    if (!user?.id) {
      alert('User not loaded');
      return;
    }
    
    setShowQRModal(true);
    setQrLoading(true);
    
    try {
      const qrCode = await generateQRCodeFromUid(user.id);
      setQrCodeData(qrCode);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  const handlePersonClick = (_person: Person) => {
    navigate('/transcript');
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white relative overflow-hidden flex flex-col font-sans min-h-screen sm:rounded-3xl">
      
      {/* Decorative Background Blobs */}
      <img src='/Circle.svg' className='w-50 h-50 absolute -right-20 top-1/2 -translate-y-1/2 pointer-events-none'/>
      <img src='/Circle.svg' className='w-60 h-60 absolute -left-25 bottom-20 pointer-events-none'/>

      {/* Header */}
      <header className="fixed w-full max-w-md bg-gradient-to-r flex py-4 items-end to-[#E73A8A] from-[#ED385A] px-4 z-20">
        <div className="flex mt-2 h-full text-white text-2xl font-semibold w-40">
          <img src='/Logo.svg' alt="Logo"/>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col overflow-y-auto mt-20 px-5 pt-4 pb-24 relative z-10">
        
        {/* Page Title - Changes based on user type */}
        <h1 className="text-[#E73A5B] text-xl font-sf-semibold mb-2">
          {isClinician ? 'My Patients' : 'My Doctors'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {isClinician 
            ? 'Manage your patient consultations' 
            : 'Connect with your healthcare providers'}
        </p>

        {/* Persons List (Doctors for patients, Patients for clinicians) */}
        <div className="flex flex-col gap-3 mb-6">
          {loading ? (
            // Loading skeleton
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : persons.length === 0 ? (
            // Empty state - different message for clinician vs patient
            <div className="bg-[#FBE4EE] rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <LucideUser className="text-[#E73A5B]" size={32} />
              </div>
              <h3 className="text-gray-800 font-sf-semibold text-lg mb-2">
                {isClinician ? 'No Patients Yet' : 'No Doctors Yet'}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {isClinician 
                  ? 'Show your QR code to patients to link them to your practice.'
                  : "Scan a doctor's QR code to get started with your first consultation."}
              </p>
            </div>
          ) : (
            persons.map((person) => (
              <button
                key={person.id}
                onClick={() => handlePersonClick(person)}
                className="bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-3 hover:shadow-[0_4px_20px_rgba(233,30,140,0.15)] transition-shadow text-left w-full"
              >
                {person.imageUrl ? (
                  <img 
                    src={person.imageUrl} 
                    alt={person.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#FBE4EE]"
                  />
                ) : (
                  <div className="w-12 h-12 bg-[#FBE4EE] rounded-full flex items-center justify-center">
                    <LucideUser className="text-[#E73A5B]" size={24} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-gray-800 font-sf-semibold">{person.name}</h3>
                  {person.specialty && (
                    <p className="text-gray-500 text-sm">{person.specialty}</p>
                  )}
                </div>
                <div className="text-[#E73A5B]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button - Different for clinician vs patient */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-5">
        {isClinician ? (
          // Clinician: Show QR Code button
          <button
            onClick={handleShowQRCode}
            className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-4 px-6 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(233,30,140,0.35)] hover:shadow-[0_12px_32px_rgba(233,30,140,0.45)] transition-shadow font-sf-semibold text-lg"
          >
            <LucideQrCode size={24} />
            Show Patient Your QR Code
          </button>
        ) : (
          // Patient: Scan QR Code button
          <button
            onClick={handleScanQRCode}
            disabled={scanning}
            className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-4 px-6 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(233,30,140,0.35)] hover:shadow-[0_12px_32px_rgba(233,30,140,0.45)] transition-shadow font-sf-semibold text-lg disabled:opacity-70"
          >
            {scanning ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Scanning...
              </>
            ) : (
              <>
                <LucideQrCode size={24} />
                Scan Doctor's QR Code
              </>
            )}
          </button>
        )}
      </div>

      {/* QR Code Modal (for clinicians) */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative">
            {/* Close button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <LucideX size={24} />
            </button>
            
            <h2 className="text-[#E73A5B] text-xl font-sf-semibold mb-2 text-center">
              Your QR Code
            </h2>
            <p className="text-gray-500 text-sm mb-6 text-center">
              Have your patient scan this code to connect with you
            </p>
            
            {/* QR Code Display */}
            <div className="flex items-center justify-center mb-6">
              {qrLoading ? (
                <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#E73A5B] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : qrCodeData ? (
                <img 
                  src={qrCodeData} 
                  alt="QR Code" 
                  className="w-64 h-64 rounded-xl"
                />
              ) : (
                <div className="w-64 h-64 bg-[#FBE4EE] rounded-xl flex flex-col items-center justify-center p-4">
                  <LucideQrCode className="text-[#E73A5B] mb-4" size={64} />
                  <p className="text-gray-600 text-sm text-center">
                    Failed to generate QR code
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-3 font-sf-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 
        ─── BACKEND INTEGRATION NOTES ───────────────────────────────────────────
        
        1. USER TYPE CHECK
           - Uses GET /auth/me to fetch user info including is_clinician boolean
           - This determines which UI to show (My Doctors vs My Patients)
        
        2. FETCH LIST BASED ON USER TYPE
           - Clinician: GET /api/clinician/patients - Returns linked patients
           - Patient: GET /api/patient/doctors - Returns linked doctors
           - Response: { persons: Person[] } or similar
        
        3. QR CODE SCANNING (for patients)
           - Use 'html5-qrcode' or '@yudiel/react-qr-scanner'
           - npm install html5-qrcode
           - Parse scanned data to get doctorId
           - Call POST /api/patient/link-doctor with doctorId
        
        4. LINKING FLOW
           - Patient scans clinician's QR → extracts doctorId
           - POST /api/patient/link-doctor { doctorId }
           - Creates relationship in database (e.g., doctor_patient_links table)
           - Refresh the persons list after successful link
        
        ──────────────────────────────────────────────────────────────────────────
      */}
    </div>
  );
};

export default Dashboard;