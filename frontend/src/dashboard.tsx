
import { LucideQrCode, LucideUser, LucideX, LucideChevronRight } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentUser } from './lib/api';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

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

// ─── Wave dividers ────────────────────────────────────────────────────────────

const WaveDivider: React.FC<{ flip?: boolean; color?: string }> = ({ flip = false, color = "white" }) => (
  <svg viewBox="0 0 400 60" xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", width: "calc(100% + 2px)", marginLeft: -1, transform: flip ? "scaleY(-1)" : "none" }}
    preserveAspectRatio="none" height="60">
    <path d="M-10,20 C40,55 100,5 160,28 C220,51 270,5 330,28 C370,43 390,18 410,22 L410,60 L-10,60 Z" fill={color} />
  </svg>
);

const WideWave: React.FC<{ color?: string; flip?: boolean }> = ({ color = "white", flip = false }) => (
  <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", width: "calc(100% + 4px)", marginLeft: -2, transform: flip ? "scaleY(-1)" : "none" }}
    preserveAspectRatio="none" height="80">
    <path d="M-10,40 C120,80 240,0 400,40 C560,80 680,5 840,38 C1000,70 1120,10 1280,42 C1380,62 1420,30 1450,38 L1450,80 L-10,80 Z" fill={color} />
  </svg>
);

// ─── QR Modal (shared between mobile & desktop) ───────────────────────────────

const QRModal: React.FC<{ qrCodeData: string; qrLoading: boolean; onClose: () => void }> = ({ qrCodeData, qrLoading, onClose }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 16, backdropFilter: "blur(4px)",
  }}>
    <div style={{
      background: "white", borderRadius: 24, padding: "32px 28px",
      maxWidth: 360, width: "100%", position: "relative",
      boxShadow: "0 24px 80px rgba(233,30,140,0.2)",
      fontFamily: "'Nunito', 'Poppins', sans-serif",
    }}>
      <button onClick={onClose} style={{
        position: "absolute", top: 16, right: 16,
        background: "#f9eef5", border: "none", borderRadius: "50%",
        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}>
        <LucideX size={18} color="#e91e8c" />
      </button>

      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "#E73A5B", textAlign: "center", letterSpacing: -0.5 }}>
        Your QR Code
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, fontWeight: 600, color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
        Have your patient scan this code to connect with you
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        {qrLoading ? (
          <div style={{ width: 220, height: 220, background: "#f3f4f6", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #E73A5B", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : qrCodeData ? (
          <img src={qrCodeData} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 16, border: "2px solid #f0d0e8" }} />
        ) : (
          <div style={{ width: 220, height: 220, background: "#FBE4EE", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}>
            <LucideQrCode size={56} color="#E73A5B" />
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontWeight: 600, textAlign: "center" }}>Failed to generate QR code</p>
          </div>
        )}
      </div>

      <button onClick={onClose} style={{
        width: "100%", background: "linear-gradient(to right, #ED385A, #E73A8A)",
        color: "white", border: "none", borderRadius: 50,
        padding: "14px 0", fontSize: 16, fontWeight: 800,
        cursor: "pointer", fontFamily: "'Nunito', sans-serif",
      }}>
        Done
      </button>
    </div>
  </div>
);

// ─── Desktop person row ───────────────────────────────────────────────────────

const PersonRow: React.FC<{ person: Person; onClick: () => void }> = ({ person, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", background: hovered ? "linear-gradient(135deg, #fff0f6, #ffe0f0)" : "white",
        border: `2px solid ${hovered ? "#e91e8c" : "#f0d0e8"}`,
        borderRadius: 16, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", textAlign: "left",
        boxShadow: hovered ? "0 6px 24px rgba(233,30,140,0.14)" : "0 2px 10px rgba(233,30,140,0.05)",
        transition: "all 0.2s ease",
        fontFamily: "'Nunito', 'Poppins', sans-serif",
      }}
    >
      {person.imageUrl ? (
        <img src={person.imageUrl} alt={person.name}
          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #f0d0e8", flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #ffe0f0, #ffd0e8)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <LucideUser size={22} color="#e91e8c" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#2d1a2e" }}>{person.name}</div>
        {person.specialty && <div style={{ fontSize: 13, fontWeight: 600, color: "#cca0bb", marginTop: 2 }}>{person.specialty}</div>}
      </div>
      <LucideChevronRight size={18} color={hovered ? "#e91e8c" : "#cca0bb"} style={{ flexShrink: 0, transition: "color 0.2s" }} />
    </button>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isClinician, setIsClinician] = useState(false);
  
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const fetchRooms = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch(`/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPersons(data.rooms || []);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const response = await getCurrentUser();
        if (response?.user) {
          setUser(response.user);
          setIsClinician(response.user.is_clinician);
          await fetchRooms();
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndData();
  }, []);

  useEffect(() => {
    if (!showScannerModal || !scanning) return;

    const initScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        scannerRef.current = new Html5Qrcode('qr-reader');
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {}
        );
      } catch (error) {
        console.error('Failed to start scanner:', error);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setShowScannerModal(false);
        setScanning(false);
        alert('Failed to start scanner.');
      }
    };

    initScanner();
  }, [showScannerModal, scanning]);

  const startScanner = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (error) {
      console.error('Camera permission denied:', error);
      alert('Camera permission denied. Please allow camera access to scan QR codes.');
      return;
    }

    setShowScannerModal(true);
    setScanning(true);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Failed to stop scanner:', error);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScannerModal(false);
    setScanning(false);
  };

  const onScanSuccess = async (clinicianId: string) => {
    await stopScanner();
    
    if (!user?.id) {
      alert('User not loaded');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/create_room?patient=${user.id}&clinician=${clinicianId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await fetchRooms();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room');
    }
  };

  const handleScanQRCode = () => {
    startScanner();
  };

  const handleShowQRCode = async () => {
    if (!user?.id) { alert('User not loaded'); return; }
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

  const handlePersonClick = (_person: Person) => navigate('/transcript');
  const primaryAction = isClinician ? handleShowQRCode : handleScanQRCode;

  // ── Mobile (pixel-faithful to original) ────────────────────────────────────

  if (!isDesktop) {
    return (
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Decorative Background Blobs */}
        <img src='/Circle.svg' className='w-50 h-50 absolute -right-20 top-1/2 -translate-y-1/2 pointer-events-none' />
        <img src='/Circle.svg' className='w-60 h-60 absolute -left-25 bottom-20 pointer-events-none' />

        {/* Header */}
        <header className="fixed w-full max-w-md bg-gradient-to-r flex py-4 items-end to-[#E73A8A] from-[#ED385A] px-4 z-20">
          <div className="flex mt-2 h-full text-white text-2xl font-semibold w-40">
            <img src='/Logo.svg' alt="Logo" />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-col overflow-y-auto mt-20 px-5 pt-4 pb-24 relative z-10">

          <h1 className="text-[#E73A5B] text-xl font-sf-semibold mb-2">
            {isClinician ? 'My Patients' : 'My Doctors'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {isClinician ? 'Manage your patient consultations' : 'Connect with your healthcare providers'}
          </p>

          {/* Persons list */}
          <div className="flex flex-col gap-3 mb-6">
            {loading ? (
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
                    <img src={person.imageUrl} alt={person.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#FBE4EE]" />
                  ) : (
                    <div className="w-12 h-12 bg-[#FBE4EE] rounded-full flex items-center justify-center">
                      <LucideUser className="text-[#E73A5B]" size={24} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-gray-800 font-sf-semibold">{person.name}</h3>
                    {person.specialty && <p className="text-gray-500 text-sm">{person.specialty}</p>}
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

        {/* FAB */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-5">
          {isClinician ? (
            <button onClick={handleShowQRCode}
              className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-4 px-6 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(233,30,140,0.35)] hover:shadow-[0_12px_32px_rgba(233,30,140,0.45)] transition-shadow font-sf-semibold text-lg">
              <LucideQrCode size={24} />
              Show Patient Your QR Code
            </button>
          ) : (
            <button onClick={handleScanQRCode} disabled={scanning}
              className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-4 px-6 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(233,30,140,0.35)] hover:shadow-[0_12px_32px_rgba(233,30,140,0.45)] transition-shadow font-sf-semibold text-lg disabled:opacity-70">
              {scanning ? (
                <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Scanning...</>
              ) : (
                <><LucideQrCode size={24} />Scan Doctor's QR Code</>
              )}
            </button>
          )}
        </div>

        {showQRModal && <QRModal qrCodeData={qrCodeData} qrLoading={qrLoading} onClose={() => setShowQRModal(false)} />}

        {showScannerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative">
              <button
                onClick={stopScanner}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <LucideX size={24} />
              </button>
              
              <h2 className="text-[#E73A5B] text-xl font-sf-semibold mb-2 text-center">
                Scan Doctor's QR Code
              </h2>
              <p className="text-gray-500 text-sm mb-6 text-center">
                Point your camera at the doctor's QR code to connect
              </p>
              
              <div id="qr-reader" className="w-full mb-6" />
              
              <button
                onClick={stopScanner}
                className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-3 font-sf-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Hero */}
      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        padding: "52px 48px 0", position: "relative", overflow: "visible",
      }}>
        {/* Blobs */}
        <div style={{ position: "absolute", top: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 48 }}>
          {/* Left copy */}
          <div>
            <h1 style={{ color: "white", fontSize: 42, fontWeight: 900, margin: "0 0 10px", letterSpacing: -1.5, lineHeight: 1.05 }}>
              {isClinician ? "My Patients" : "My Doctors"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {isClinician ? "Manage your patient consultations and sessions" : "Connect with your healthcare providers"}
            </p>
          </div>

        </div>

        <div style={{ marginBottom: -2, marginLeft: -48, marginRight: -48 }}>
          <WideWave color="#fdf6fa" />
        </div>
      </section>

      {/* Content grid */}
      <div style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "40px 48px 56px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>

        {/* Left — list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#2d1a2e", letterSpacing: -0.5 }}>
              {isClinician ? "Patient List" : "Your Doctors"}
            </h2>
            {!loading && persons.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#cca0bb" }}>
                {persons.length} {persons.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {loading ? (
            /* Desktop skeleton */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: "#f9eef5", borderRadius: 16, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  border: "2px solid #f0d0e8", animation: "shimmer 1.5s ease-in-out infinite",
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0d0e8", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, background: "#f0d0e8", borderRadius: 7, width: "45%", marginBottom: 8 }} />
                    <div style={{ height: 11, background: "#f0d0e8", borderRadius: 6, width: "28%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : persons.length === 0 ? (
            /* Desktop empty state */
            <div style={{
              background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
              borderRadius: 24, padding: "56px 32px",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              border: "2px solid #f0d0e8",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20, boxShadow: "0 4px 16px rgba(233,30,140,0.15)",
              }}>
                <LucideUser size={36} color="#e91e8c" />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 900, color: "#2d1a2e", letterSpacing: -0.5 }}>
                {isClinician ? "No Patients Yet" : "No Doctors Yet"}
              </h3>
              <p style={{ margin: "0 0 28px", fontSize: 15, fontWeight: 600, color: "#9a7a99", lineHeight: 1.65, maxWidth: 380 }}>
                {isClinician
                  ? "Show your QR code to patients to link them to your practice."
                  : "Scan a doctor's QR code to get started with your first consultation."}
              </p>
              <button onClick={primaryAction} style={{
                background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
                color: "white", border: "none", borderRadius: 50,
                padding: "14px 32px", fontSize: 16, fontWeight: 800,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                boxShadow: "0 6px 20px rgba(233,30,140,0.3)",
                display: "flex", alignItems: "center", gap: 8,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(233,30,140,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(233,30,140,0.3)"; }}
              >
                <LucideQrCode size={18} />
                {isClinician ? "Show My QR Code" : "Scan QR Code"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {persons.map((person) => (
                <PersonRow key={person.id} person={person} onClick={() => handlePersonClick(person)} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* QR action card */}
          <div style={{
            background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
            borderRadius: 20, padding: "24px 20px",
            display: "flex", flexDirection: "column", alignItems: "center",
            textAlign: "center", gap: 12,
            boxShadow: "0 8px 32px rgba(233,30,140,0.3)",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LucideQrCode size={26} color="white" />
            </div>
            <div>
              <div style={{ color: "white", fontSize: 16, fontWeight: 900, marginBottom: 4 }}>
                {isClinician ? "Share Your QR Code" : "Scan a QR Code"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                {isClinician
                  ? "Patients can scan your code to instantly link to your practice."
                  : "Scan your doctor's QR code to start a session."}
              </div>
            </div>
            <button onClick={primaryAction} style={{
              background: "white", border: "none", borderRadius: 50,
              padding: "11px 22px", fontSize: 14, fontWeight: 800,
              color: "#e91e8c", cursor: "pointer",
              fontFamily: "'Nunito', sans-serif", width: "100%",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              transition: "transform 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {isClinician ? "Show My QR Code" : "Open Scanner"}
            </button>
          </div>


          {/* Account card */}
          {user && (
            <div style={{
              background: "white", borderRadius: 20, padding: "20px",
              border: "2px solid #f0d0e8",
              boxShadow: "0 4px 20px rgba(233,30,140,0.07)",
            }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 800, color: "#e91e8c", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Your Account
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #f9eef5" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <LucideUser size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#2d1a2e" }}>{user.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#cca0bb" }}>{user.email}</div>
                </div>
              </div>
              {[
                { label: "Role", value: isClinician ? "Clinician" : "Patient" },
                { label: "ID", value: `#${user.id.slice(0, 8)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f9eef5" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#cca0bb" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#2d1a2e" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip card */}
          <div style={{
            background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
            borderRadius: 16, padding: "16px",
            border: "2px solid #f0d0e8",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e97db0", lineHeight: 1.6 }}>
              💡 {isClinician
                ? "Sessions are created automatically when a patient scans your QR code."
                : "Each QR code links you to a specific doctor's practice."}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className='mt-10' style={{ background: "#2d1a2e", padding: "40px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <img src="/Logo.svg" alt="HealthSafe" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        </div>
      </footer>

      {showQRModal && <QRModal qrCodeData={qrCodeData} qrLoading={qrLoading} onClose={() => setShowQRModal(false)} />}
      
      {/* QR Scanner Modal (for patients) */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative">
            <button
              onClick={stopScanner}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <LucideX size={24} />
            </button>
            
            <h2 className="text-[#E73A5B] text-xl font-sf-semibold mb-2 text-center">
              Scan Doctor's QR Code
            </h2>
            <p className="text-gray-500 text-sm mb-6 text-center">
              Point your camera at the doctor's QR code to connect
            </p>
            
            <div id="qr-reader" className="w-full mb-6" />
            
            <button
              onClick={stopScanner}
              className="w-full bg-gradient-to-r from-[#ED385A] to-[#E73A8A] text-white rounded-full py-3 font-sf-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;