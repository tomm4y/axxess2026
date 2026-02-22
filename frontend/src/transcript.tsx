import { LucideMic, LucideArrowLeft, LucideSquare } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getCurrentUser } from './lib/api';
import { eventSocket } from './lib/eventSocket';

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

const MicButton: React.FC<{ recording: boolean; onClick: () => void; disabled?: boolean; size?: number }> = ({ recording, onClick, disabled, size = 72 }) => {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };
  
  return (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <button
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: recording ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : disabled ? "#e5e7eb" : "white",
        border: `3px solid ${recording ? "transparent" : disabled ? "#d1d5db" : "#f0d0e8"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: recording ? "0 8px 28px rgba(233,30,140,0.45)" : "0 4px 16px rgba(233,30,140,0.12)",
        transition: "all 0.25s ease",
        opacity: disabled ? 0.6 : 1,
      } as React.CSSProperties}
    >
      {recording ? (
        <LucideSquare color="white" size={Math.round(size * 0.3)} fill="white" />
      ) : (
        <LucideMic color={disabled ? "#9ca3af" : "#e91e8c"} size={Math.round(size * 0.39)} />
      )}
    </button>
    <span style={{ fontSize: 12, fontWeight: 700, color: "#cca0bb", textTransform: "uppercase", letterSpacing: 0.5 }}>
      {disabled ? "Session Inactive" : recording ? "Tap to stop" : "Tap to record"}
    </span>
  </div>
  );
};

const TranscriptBox: React.FC<{ recording: boolean; segments: { text: string; role: string | null }[] }> = ({ recording, segments }) => (
  <div style={{
    background: "white", border: `2px solid ${recording ? "#e91e8c" : "#f0d0e8"}`,
    borderRadius: 18, padding: "16px",
    minHeight: 220,
    position: "relative",
    boxShadow: recording ? "0 4px 20px rgba(233,30,140,0.15)" : "0 4px 20px rgba(233,30,140,0.07)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  }}>
    {segments.length === 0 ? (
      <p style={{ color: "#cca0bb", fontSize: 14, lineHeight: 1.7, fontWeight: 600, fontStyle: "italic", margin: 0 }}>
        {recording ? "Listening…" : "Waiting for recording to start..."}
      </p>
    ) : (
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {segments.map((seg, i) => (
          <p key={i} style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.6, color: "#2d1a2e" }}>
            {seg.role && <strong style={{ color: seg.role === "Doctor" ? "#e91e8c" : "#6b7280" }}>{seg.role}: </strong>}
            {seg.text}
          </p>
        ))}
      </div>
    )}
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

interface UserData {
  id: string;
  email: string;
  name: string;
  is_clinician: boolean;
}

const Transcript: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [recording, setRecording] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isClinician, setIsClinician] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<{ text: string; role: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    const checkSessionActive = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`/api/session/${sessionId}/active`);
        if (response.ok) {
          const data = await response.json();
          setSessionActive(data.active);
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    };
    
    checkSessionActive();
    const interval = setInterval(checkSessionActive, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    
    const unsubTranscript = eventSocket.registerOnTranscript((event) => {
      if (event.payload.isFinal) {
        setTranscriptSegments(prev => [...prev, { text: event.payload.text, role: event.payload.role }]);
      }
    });
    
    const unsubReady = eventSocket.registerOnReady(() => {
      console.log('[Transcript] Deepgram ready');
    });
    
    const unsubRecordingStarted = eventSocket.register((event) => {
      if (event.type === 'recording_started') {
        console.log('[Transcript] Recording started event received');
        setRecording(true);
      }
      return () => {};
    });
    
    const unsubRecordingStopped = eventSocket.register((event) => {
      if (event.type === 'recording_stopped') {
        console.log('[Transcript] Recording stopped event received');
        setRecording(false);
      }
      return () => {};
    });
    
    return () => {
      unsubTranscript();
      unsubReady();
      unsubRecordingStarted();
      unsubRecordingStopped();
    };
  }, [sessionId]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const startRecording = async () => {
    if (!sessionId || !sessionActive) return;
    
    try {
      await eventSocket.ensureConnected();
      eventSocket.startTranscription(sessionId);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        eventSocket.sendAudio(new Uint8Array(pcmData.buffer));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionId) {
      eventSocket.stopTranscription(sessionId);
    }
    setRecording(false);
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sharedStyles = (
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.75); }
      }
    `}</style>
  );

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#fdf6fa", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: "SF-Pro-Display-Semibold, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
        {sharedStyles}

        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", paddingBottom: isClinician ? 0 : 120 }}>

          <div style={{
            background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
            paddingTop: 52, paddingBottom: 0, paddingLeft: 24, paddingRight: 24,
            position: "relative", overflow: "visible",
          }}>
            <Link to="/dashboard" style={{ position: "absolute", top: 20, left: 20 }}>
              <LucideArrowLeft color="white" size={28} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", marginBlock: 10 }}>
              <img src="/Logo.svg" alt="HealthSafe" style={{ height: 32 }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 4px", letterSpacing: -0.5, lineHeight: 1.1 }}>
                Session
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                {sessionActive ? "Active session" : "Session inactive"}
              </p>
            </div>
            <div style={{ marginBottom: -2, marginLeft: -24, marginRight: -24 }}>
              <WaveDivider color="white" />
            </div>
          </div>

          <div style={{ flex: 1, background: "white", padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
                borderRadius: 20, padding: "20px 28px",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, border: "2px solid #f0d0e8",
                boxShadow: "0 4px 20px rgba(233,30,140,0.1)", minWidth: 160,
              }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ff4d7d, #e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(233,30,140,0.2)" }}>
                  <LucideMic size={32} color="white" />
                </div>
                <span style={{ color: "#2d1a2e", fontSize: 15, fontWeight: 800 }}>{isClinician ? "Patient" : "Doctor"}</span>
                <RecordingPill recording={recording} />
              </div>
            </div>

            <div>
              <h2 style={{ color: "#e91e8c", fontSize: 13, fontWeight: 800, margin: "0 0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>
                Transcription
              </h2>
              <TranscriptBox recording={recording} segments={transcriptSegments} />
            </div>
          </div>

          {/* Pinned record button for patients only */}
          {!isClinician && (
            <div style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(to top, white 80%, transparent)",
              padding: "24px 16px 16px",
              display: "flex",
              justifyContent: "center",
              zIndex: 100,
            }}>
              <MicButton recording={recording} onClick={toggleRecording} disabled={!sessionActive} />
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      {sharedStyles}

      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        padding: "48px 48px 0", position: "relative", overflow: "visible",
      }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", paddingBottom: 40 }}>
          <div>
            <h1 style={{ color: "white", fontSize: 38, fontWeight: 900, margin: "0 0 8px", letterSpacing: -1.5, lineHeight: 1.05 }}>
              Session
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {sessionActive ? "Active session" : "Session inactive"} · {transcriptSegments.length} segments
            </p>
          </div>
        </div>

        <div style={{ marginBottom: -2, marginLeft: -48, marginRight: -48 }}>
          <WideWave color="#fdf6fa" />
        </div>
      </section>

      <div style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 48px", display: "flex", gap: 28 }}>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

          <TranscriptBox recording={recording} segments={transcriptSegments} />
        </div>

        <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
            borderRadius: 20, padding: "20px 16px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, border: "2px solid #f0d0e8",
            boxShadow: "0 4px 20px rgba(233,30,140,0.1)", width: "100%",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #ff4d7d, #e91e8c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(233,30,140,0.2)" }}>
              <LucideMic size={28} color="white" />
            </div>
            <span style={{ color: "#2d1a2e", fontSize: 14, fontWeight: 800 }}>{isClinician ? "Patient" : "Doctor"}</span>
            <RecordingPill recording={recording} />
          </div>

          {/* Only show record button for patients on desktop */}
          {!isClinician && (
            <MicButton recording={recording} onClick={toggleRecording} disabled={!sessionActive} size={80} />
          )}
        </div>
      </div>

      <footer style={{ background: "#2d1a2e", padding: "40px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/Logo.svg" alt="HealthSafe" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        </div>
      </footer>
    </div>
  );
};

export default Transcript;
