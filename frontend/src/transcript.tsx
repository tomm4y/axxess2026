import { LucideMic, LucideArrowLeft, LucideStopCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { getCurrentUser } from './lib/api';
import { eventSocket } from './lib/eventSocket';

const RecordingPill: React.FC<{ recording: boolean }> = ({ recording }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 5,
    background: recording ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "#f0d0e8",
    borderRadius: 50, padding: "4px 12px",
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

interface TranscriptSegmentData {
  text: string;
  role: string | null;
  isFinal: boolean;
  startMs: number;
}

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const Transcript: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isClinician, setIsClinician] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentSegmentRef = useRef<HTMLDivElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingAccumulatedRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const fetchCachedTranscript = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`/api/session/${sessionId}/transcript`);
        if (response.ok) {
          const data = await response.json();
          if (data.transcript && data.transcript.length > 0) {
            console.log('[Transcript] Loaded cached transcript:', data.transcript.length, 'segments');
            setSegments(data.transcript);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cached transcript:', error);
      }
    };

    const checkSessionActive = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`/api/session/${sessionId}/active`);
        if (response.ok) {
          const data = await response.json();
          setSessionActive(data.active);
          
          // If session is active and we have no segments, fetch cached transcript
          if (data.active && segments.length === 0) {
            await fetchCachedTranscript();
          }
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    };
    
    // Initial fetch of cached transcript
    fetchCachedTranscript();
    
    checkSessionActive();
    const interval = setInterval(checkSessionActive, 5000);
    return () => clearInterval(interval);
  }, [sessionId, segments.length]);

  useEffect(() => {
    if (!sessionId) return;
    
    const unsubTranscript = eventSocket.registerOnTranscript((event) => {
      setSegments(prev => {
        const nextSegment: TranscriptSegmentData = {
          text: event.payload.text,
          role: event.payload.role,
          isFinal: event.payload.isFinal,
          startMs: event.payload.startMs,
        };

        const updated = [...prev];
        const existingIndex = typeof event.payload.startMs === 'number'
          ? updated.findIndex(seg => seg.startMs === event.payload.startMs)
          : -1;

        if (existingIndex >= 0) {
          updated[existingIndex] = nextSegment;
          return updated;
        }

        if (!event.payload.isFinal) {
          const last = updated[updated.length - 1];
          if (last && !last.isFinal && last.role === event.payload.role) {
            updated[updated.length - 1] = nextSegment;
            return updated;
          }
          return [...updated, nextSegment];
        }

        const last = updated[updated.length - 1];
        if (last && !last.isFinal && last.role === event.payload.role) {
          updated[updated.length - 1] = nextSegment;
          return updated;
        }

        return [...updated, nextSegment];
      });
    });
    
    const unsubReady = eventSocket.registerOnReady(() => {
      console.log('[Transcript] Deepgram ready');
    });
    
    const unsubRecordingStarted = eventSocket.registerOnAny((event) => {
      if (event.type === 'recording_started') {
        setRecording(true);
      }
    });
    
    const unsubRecordingStopped = eventSocket.registerOnAny((event) => {
      if (event.type === 'recording_stopped') {
        setRecording(false);
      }
    });
    
    const unsubSessionEnded = eventSocket.registerOnSessionEnded(() => {
      console.log('[Transcript] Session ended');
    });
    
    return () => {
      unsubTranscript();
      unsubReady();
      unsubRecordingStarted();
      unsubRecordingStopped();
      unsubSessionEnded();
    };
  }, [sessionId]);

  useEffect(() => {
    if (currentSegmentRef.current && containerRef.current) {
      currentSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [segments]);

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
      
      recordingAccumulatedRef.current = 0;
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
      setRecording(true);
      setRecordingPaused(false);
      updateRecordingDuration();
      startDurationTimer();

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const updateRecordingDuration = () => {
    const base = recordingAccumulatedRef.current;
    const active = recordingStartTimeRef.current > 0 ? (Date.now() - recordingStartTimeRef.current) : 0;
    setRecordingDuration(base + active);
  };

  const startDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(updateRecordingDuration, 100);
  };

  const pauseRecording = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
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

    if (recordingStartTimeRef.current > 0) {
      recordingAccumulatedRef.current += Date.now() - recordingStartTimeRef.current;
      recordingStartTimeRef.current = 0;
    }

    updateRecordingDuration();
    setRecording(false);
    setRecordingPaused(true);
  };

  const resumeRecording = async () => {
    if (!sessionId) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      eventSocket.startTranscription(sessionId);
      
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
      
      recordingStartTimeRef.current = Date.now();
      updateRecordingDuration();
      startDurationTimer();
      setRecording(true);
      setRecordingPaused(false);
    } catch (error) {
      console.error('Failed to resume recording:', error);
      alert('Failed to resume recording. Please check microphone permissions.');
    }
  };

  const endSession = async () => {
    if (!sessionId || !isClinician) return;
    
    // Stop recording first
    if (recording) {
      pauseRecording();
    }
    
    try {
      // Call API to end session
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/session/${sessionId}/end`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user?.id || '',
          userName: user?.name || 'Doctor'
        })
      });
      
      if (response.ok) {
        // Send WebSocket event to notify patient
        eventSocket.endSession(sessionId);
        console.log('[Transcript] Session ended successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to end session');
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to end session');
    }
  };

  const goToActiveSession = () => {
    navigate(`/transcript?session_id=${sessionId}`);
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
      <div style={{ height: "100vh", width: "100vw", background: "#fdf6fa", display: "flex", flexDirection: "column", fontFamily: "SF-Pro-Display-Semibold, sans-serif", overflow: "hidden" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
        {sharedStyles}

        {/* Header - pinned */}
        <div style={{
          background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
          padding: "16px 20px 16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to="/dashboard">
                <LucideArrowLeft color="white" size={24} />
              </Link>
              <img src="/Logo.svg" alt="HealthSafe" style={{ height: 24 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isClinician && sessionActive && (
                <button
                  onClick={endSession}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 50,
                    padding: "6px 12px",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                >
                  <LucideStopCircle size={12} />
                  End
                </button>
              )}
              <RecordingPill recording={recording} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h1 style={{ color: "white", fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
              Session
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600, margin: 0 }}>
              {sessionActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        {/* Transcript Container - scrollable */}
        <div 
          ref={containerRef}
          style={{ 
            flex: 1, 
            overflowY: "auto", 
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          {segments.length === 0 ? (
            <div style={{ textAlign: "center", color: "#cca0bb", fontSize: 16, fontWeight: 600, marginTop: 40 }}>
              {recording ? "Listening..." : "Tap the microphone to start recording"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {segments.map((seg, i) => {
                const isCurrent = i === segments.length - 1;
                const isPrev = i === segments.length - 2;
                return (
                  <div 
                    key={seg.startMs ?? i} 
                    ref={isCurrent ? currentSegmentRef : null}
                    style={{
                      transition: "all 0.3s ease",
                      opacity: isCurrent ? 1 : isPrev ? 0.7 : 0.4,
                    }}
                  >
                    {seg.role && (
                      <span style={{ 
                        color: seg.role === "Doctor" ? "#e91e8c" : "#6b7280",
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 4,
                        display: "block",
                      }}>
                        {seg.role}
                      </span>
                    )}
                    <p style={{ 
                      margin: 0, 
                      fontSize: isCurrent ? 20 : 16,
                      fontWeight: isCurrent ? 800 : 600,
                      color: "#2d1a2e",
                      lineHeight: 1.5,
                    }}>
                      {seg.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recording controls for patients */}
        {!isClinician && sessionActive && (
          recording || recordingPaused ? (
            <div 
              style={{
                position: "fixed",
                bottom: 100,
                left: 16,
                right: 16,
                height: 56,
                background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
                borderRadius: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                boxShadow: "0 8px 28px rgba(233,30,140,0.35)",
                cursor: !recording ? "pointer" : "default",
                transition: "all 0.25s ease",
                zIndex: 100,
              }}
            >
              <div 
                onClick={!recording ? goToActiveSession : undefined}
                style={{ display: "flex", alignItems: "center", gap: 16 }}
              >
                {recording && (
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: "white", animation: "pulse 1s infinite"
                  }} />
                )}
                <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>
                  {formatDuration(recordingDuration)}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); recording ? pauseRecording() : resumeRecording(); }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {recording ? (
                  <LucideStopCircle color="white" size={32} fill="white" />
                ) : (
                  <LucideMic color="white" size={28} />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              style={{
                position: "fixed",
                bottom: 100,
                left: "50%",
                transform: "translateX(-50%)",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "white",
                border: "3px solid #f0d0e8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(233,30,140,0.2)",
                zIndex: 100,
              }}
            >
              <LucideMic color="#e91e8c" size={24} />
            </button>
          )
        )}

      </div>
    );
  }

  // Desktop view
  return (
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      {sharedStyles}

      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        padding: "48px 48px 20px", position: "relative",
      }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20 }}>
          <div>
            <h1 style={{ color: "white", fontSize: 38, fontWeight: 900, margin: "0 0 8px", letterSpacing: -1.5, lineHeight: 1.05 }}>
              Session
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, margin: 0 }}>
              {sessionActive ? "Active session" : "Session inactive"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isClinician && sessionActive && (
              <button
                onClick={endSession}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: 50,
                  padding: "10px 20px",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
              >
                <LucideStopCircle size={16} />
                End Session
              </button>
            )}
            <RecordingPill recording={recording} />
          </div>
        </div>
      </section>

      <div style={{ flex: 1, maxWidth: 800, margin: "0 auto", padding: "40px 48px", display: "flex", flexDirection: "column" }}>
        <div 
          ref={containerRef}
          style={{ 
            flex: 1, 
            overflowY: "auto", 
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {segments.length === 0 ? (
            <div style={{ textAlign: "center", color: "#cca0bb", fontSize: 18, fontWeight: 600 }}>
              {recording ? "Listening..." : "Waiting for recording to start..."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {segments.map((seg, i) => {
                const isCurrent = i === segments.length - 1;
                const isPrev = i === segments.length - 2;
                return (
                  <div 
                    key={seg.startMs ?? i} 
                    ref={isCurrent ? currentSegmentRef : null}
                    style={{
                      transition: "all 0.3s ease",
                      opacity: isCurrent ? 1 : isPrev ? 0.7 : 0.4,
                    }}
                  >
                    {seg.role && (
                      <span style={{ 
                        color: seg.role === "Doctor" ? "#e91e8c" : "#6b7280",
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                        display: "block",
                      }}>
                        {seg.role}
                      </span>
                    )}
                    <p style={{ 
                      margin: 0, 
                      fontSize: isCurrent ? 24 : 18,
                      fontWeight: isCurrent ? 800 : 600,
                      color: "#2d1a2e",
                      lineHeight: 1.5,
                    }}>
                      {seg.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isClinician && sessionActive && (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <button
              onClick={recording || recordingPaused ? (recording ? pauseRecording : resumeRecording) : startRecording}
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: recording ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : recordingPaused ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "white",
                border: `3px solid ${recording || recordingPaused ? "transparent" : "#f0d0e8"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: recording || recordingPaused ? "0 8px 28px rgba(233,30,140,0.45)" : "0 4px 16px rgba(233,30,140,0.12)",
                transition: "all 0.25s ease",
              }}
            >
              {recording ? (
                <LucideStopCircle color="white" size={44} fill="white" />
              ) : recordingPaused ? (
                <LucideMic color="white" size={40} />
              ) : (
                <LucideMic color="#e91e8c" size={40} />
              )}
            </button>
          </div>
        )}

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
