import { LucideQrCode, LucideUser, LucideX } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentUser } from './lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

// TODO [BACKEND]: Define the Doctor/Patient type based on your database schema
interface Person {
  id: string;
  name: string;
  specialty?: string;  // For doctors
  imageUrl?: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  is_clinician: boolean;
}

// ─── QR Code Generation Placeholder ───────────────────────────────────────────

/**
 * TODO [BACKEND]: Generate QR code from doctor's UID
 * 
 * This function should:
 * 1. Take the doctor's UID (from Supabase auth)
 * 2. Generate a QR code image/data URL
 * 3. Return the QR code as a base64 string or data URL
 * 
 * Suggested libraries:
 * - npm install qrcode
 * - npm install react-qr-code
 * 
 * Example implementation with 'qrcode' library:
 * ```
 * import QRCode from 'qrcode';
 * 
 * const generateQRCode = async (doctorUid: string): Promise<string> => {
 *   try {
 *     // You can encode just the UID or a full URL/JSON object
 *     const qrData = JSON.stringify({ doctorId: doctorUid, type: 'doctor-link' });
 *     const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
 *       width: 256,
 *       margin: 2,
 *       color: { dark: '#E73A5B', light: '#FFFFFF' }
 *     });
 *     return qrCodeDataUrl;
 *   } catch (error) {
 *     console.error('Failed to generate QR code:', error);
 *     throw error;
 *   }
 * };
 * ```
 * 
 * @param doctorUid - The doctor's UID from Supabase auth (users.id)
 * @returns Promise<string> - Base64 data URL of the QR code image
 */
const generateQRCodeFromUid = async (_doctorUid: string): Promise<string> => {
  // TODO [BACKEND]: Implement QR code generation
  // For now, return a placeholder
  console.log('QR Code generation not yet implemented. Doctor UID:', _doctorUid);
  
  // Return empty string - replace with actual QR code data URL
  return '';
};

// ─── Dashboard Component ──────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // User state - to determine if clinician or patient
  const [user, setUser] = useState<UserData | null>(null);
  const [isClinician, setIsClinician] = useState(false);
  
  // TODO [BACKEND]: Use setPersons when fetching from API
  // For clinicians: this is patients list
  // For patients: this is doctors list
  const [persons, _setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  
  // QR Code modal state (for clinicians)
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    // Fetch user info to check if clinician
    const fetchUserAndData = async () => {
      try {
        // TODO [BACKEND]: This calls GET /auth/me to get user info
        const response = await getCurrentUser();
        if (response?.user) {
          setUser(response.user);
          setIsClinician(response.user.is_clinician);
          
          // TODO [BACKEND]: Based on user type, fetch appropriate list
          // If clinician: fetch patients linked to this doctor
          // If patient: fetch doctors linked to this patient
          // 
          // Example:
          // const token = localStorage.getItem('access_token');
          // const endpoint = response.user.is_clinician 
          //   ? 'http://localhost:3000/api/clinician/patients'
          //   : 'http://localhost:3000/api/patient/doctors';
          // const listResponse = await fetch(endpoint, {
          //   headers: { 'Authorization': `Bearer ${token}` }
          // });
          // const data = await listResponse.json();
          // setPersons(data.persons || data.doctors || data.patients);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndData();
  }, []);

  // Patient action: Scan doctor's QR code
  const handleScanQRCode = () => {
    // TODO [BACKEND]: Implement QR code scanning functionality
    // This should:
    // 1. Open camera/QR scanner
    // 2. Scan doctor's QR code (containing doctor ID or room invite)
    // 3. Call backend API to link patient with doctor
    // Example:
    // const linkDoctor = async (doctorId: string) => {
    //   const token = localStorage.getItem('access_token');
    //   const response = await fetch('http://localhost:3000/api/patient/link-doctor', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`
    //     },
    //     body: JSON.stringify({ doctorId })
    //   });
    //   if (response.ok) {
    //     // Refresh list
    //   }
    // };

    setScanning(true);
    alert('QR Scanner will be integrated here. Backend developer: implement camera access and QR parsing.');
    setScanning(false);
  };

  // Clinician action: Show QR code to patient
  const handleShowQRCode = async () => {
    if (!user?.id) {
      alert('User not loaded');
      return;
    }
    
    setShowQRModal(true);
    setQrLoading(true);
    
    try {
      // TODO [BACKEND]: Generate QR code from doctor's UID
      const qrCode = await generateQRCodeFromUid(user.id);
      setQrCodeData(qrCode);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  // TODO [BACKEND]: Use person param when navigating to session
  const handlePersonClick = (_person: Person) => {
    // TODO [BACKEND]: Navigate to session/transcript page
    // For clinicians: navigate to session with this patient
    // For patients: navigate to session with this doctor
    // Example:
    // navigate(`/session/${person.id}`);
    // or
    // navigate(`/transcript?${isClinician ? 'patientId' : 'doctorId'}=${person.id}`);
    
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
            // Person cards
            // TODO [BACKEND]: Map through actual persons from API response
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
                // TODO [BACKEND]: Display actual QR code image
                <img 
                  src={qrCodeData} 
                  alt="QR Code" 
                  className="w-64 h-64 rounded-xl"
                />
              ) : (
                // Placeholder when QR generation not implemented
                <div className="w-64 h-64 bg-[#FBE4EE] rounded-xl flex flex-col items-center justify-center p-4">
                  <LucideQrCode className="text-[#E73A5B] mb-4" size={64} />
                  <p className="text-gray-600 text-sm text-center">
                    QR Code will appear here once backend integration is complete
                  </p>
                  <p className="text-gray-400 text-xs text-center mt-2">
                    Doctor ID: {user?.id?.slice(0, 8)}...
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
        
        3. QR CODE GENERATION (for clinicians)
           - Use 'qrcode' or 'react-qr-code' library
           - npm install qrcode @types/qrcode
           - Generate QR containing doctor's UID from Supabase (user.id)
           - See generateQRCodeFromUid function above for implementation notes
        
        4. QR CODE SCANNING (for patients)
           - Use 'html5-qrcode' or '@yudiel/react-qr-scanner'
           - npm install html5-qrcode
           - Parse scanned data to get doctorId
           - Call POST /api/patient/link-doctor with doctorId
        
        5. LINKING FLOW
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
