import { LucideMic, LucideArrowLeft, LucideDownload, LucideCopy, LucideUsers } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getCurrentUser } from './lib/api';

// ─── Shared Wave Components ───────────────────────────────────────────────────

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

// ─── Shared sub-components ────────────────────────────────────────────────────

const RecordingPill: React.FC<{ recording: boolean }> = ({ recording }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 5,
    background: recording ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "#f0d0e8",
    borderRadius: 50, padding: "4px 12px", transition: "background 0.3s ease",
  }}>
    <div style={{
      width: 7, height: 7, borderRadius: "50%",
      background: recording ? "white" : "#cca0bb",
      animation: recording ? "pulse 1.2s ease-in-out infinite" : "none",
    }} />
    <span style={{
      fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" as const,
      color: recording ? "white" : "#cca0bb",
    }}>
      {recording ? "Recording" : "Standby"}
    </span>
  </div>
);



const TranscriptBox: React.FC<{ recording: boolean; fullHeight?: boolean }> = ({ recording, fullHeight }) => (
  <div style={{
    background: "white", border: `2px solid ${recording ? "#e91e8c" : "#f0d0e8"}`,
    borderRadius: 18, padding: "16px",
    height: fullHeight ? "100%" : undefined,
    minHeight: fullHeight ? undefined : 220,
    flex: fullHeight ? 1 : undefined,
    position: "relative",
    boxShadow: recording ? "0 4px 20px rgba(233,30,140,0.15)" : "0 4px 20px rgba(233,30,140,0.07)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  }}>
    <p style={{ color: "#cca0bb", fontSize: 14, lineHeight: 1.7, fontWeight: 600, fontStyle: "italic", margin: 0 }}>
      {recording ? "Listening…" : "Click the microphone to start recording your session."}
    </p>
    {recording && (
      <div style={{
        position: "absolute", top: 12, right: 12,
        display: "flex", alignItems: "center", gap: 5,
        background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
        borderRadius: 50, padding: "3px 10px",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: "white", letterSpacing: 0.5 }}>LIVE</span>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Transcript: React.FC = () => {

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
  const [recording, setRecording] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // User state - to determine if clinician or patient
  const [user, setUser] = useState<UserData | null>(null);
  const [isClinician, setIsClinician] = useState(false);
  
  const [persons, _setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

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


  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sharedStyles = (
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.75); }
      }
    `}</style>
  );

  // ── Mobile ──────────────────────────────────────────────────────────────────

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: "SF-Pro-Display-Semibold, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
        {sharedStyles}

        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>

          {/* Hero */}
          <div style={{
            background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
            paddingTop: 52, paddingBottom: 0, paddingLeft: 24, paddingRight: 24,
            position: "relative", overflow: "visible",
          }}>
            <Link to="/" className="absolute top-5 left-5">
              <LucideArrowLeft color="white" size={28} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", marginBlock: 10 }}>
              <img src="/Logo.svg" alt="HealthSafe" style={{ height: 32 }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 4px", letterSpacing: -0.5, lineHeight: 1.1 }}>
                Session 12345
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                Live transcription
              </p>
            </div>
            <div style={{ marginBottom: -2, marginLeft: -24, marginRight: -24 }}>
              <WaveDivider color="white" />
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, background: "white", padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Doctor card */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
                borderRadius: 20, padding: "20px 28px",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, border: "2px solid #f0d0e8",
                boxShadow: "0 4px 20px rgba(233,30,140,0.1)", minWidth: 160,
              }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "3px solid white", boxShadow: "0 4px 16px rgba(233,30,140,0.2)" }}>
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&h=200&auto=format&fit=crop" alt="Dr. X" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ color: "#2d1a2e", fontSize: 15, fontWeight: 800 }}>Dr. X</span>
                <RecordingPill recording={recording} />
              </div>
            </div>

            {/* Transcript box */}
            <div>
              <h2 style={{ color: "#e91e8c", fontSize: 13, fontWeight: 800, margin: "0 0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Transcription
              </h2>
              <TranscriptBox recording={recording} />
            </div>

          </div>

          {/* Footer wave */}
          <div style={{ position: "relative", height: 60, background: "linear-gradient(160deg, #ff4d7d 0%, #e91e8c 100%)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
              <WaveDivider color="white" flip={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      {sharedStyles}

      {/* Hero banner */}
      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        padding: "48px 48px 0", position: "relative", overflow: "visible",
      }}>
        {/* Blobs */}
        <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div className="flex flex-col" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", paddingBottom: 40 }}>
          <Link to="">
            <img src='/Logo.svg' className='w-54 mb-10'/>
          </Link>
          <div>
            <h1 style={{ color: "white", fontSize: 38, fontWeight: 900, margin: "0 0 8px", letterSpacing: -1.5, lineHeight: 1.05 }}>
              Session 12345
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, margin: 0 }}>
              Live transcription · Started just now
            </p>
          </div>

        </div>

        <div style={{ marginBottom: -2, marginLeft: -48, marginRight: -48 }}>
          <WideWave color="#fdf6fa" />
        </div>
      </section>

      {/* Main 3-column layout */}
      <div className='flex flex-row gap-10 items-center justify-center'>

        {/* Centre column — transcript */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="flex" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#e91e8c", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Transcription
            </h2>
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg, #ff4d7d, #e91e8c)", borderRadius: 50, padding: "3px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white", animation: "pulse 1.2s ease-in-out infinite" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "white", letterSpacing: 0.5 }}>LIVE</span>
              </div>
            )}
          </div>

          <div className="w-[800px] flex" style={{
            background: "white", border: `2px solid ${recording ? "#e91e8c" : "#f0d0e8"}`,
            borderRadius: 20, padding: "24px",
            minHeight: 340,
            boxShadow: recording ? "0 4px 24px rgba(233,30,140,0.15)" : "0 4px 20px rgba(233,30,140,0.07)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            <p style={{ color: "#cca0bb", fontSize: 15, lineHeight: 1.8, fontWeight: 600, fontStyle: "italic", margin: 0 }}>
              {recording
                ? "Listening… Start speaking to see transcription appear here in real time."
                : "Wait for the patient to start recording."}
            </p>
          </div>
        </div>

        {/* Right column — controls */}
        <div className="mt-8" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {/* Doctor card */}
          <div style={{
            background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
            borderRadius: 20, padding: "20px 16px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, border: "2px solid #f0d0e8",
            boxShadow: "0 4px 20px rgba(233,30,140,0.1)", width: "100%",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "3px solid white", boxShadow: "0 4px 16px rgba(233,30,140,0.2)" }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&h=200&auto=format&fit=crop" alt="Dr. X" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <span style={{ color: "#2d1a2e", fontSize: 14, fontWeight: 800 }}>Patient</span>
            <RecordingPill recording={recording} />
          </div>


        </div>
      </div>

      {/* Footer */}
      <footer className='mt-10' style={{ background: "#2d1a2e", padding: "40px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <img src="/Logo.svg" alt="HealthSafe" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        </div>
      </footer>
    </div>
  );
};

export default Transcript;