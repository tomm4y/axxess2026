import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/AuthContext';
import { useSearchParams } from 'react-router';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  doctorName: string;
  date: string; // ISO string
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif";

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

// ─── Phone icon (inline SVG) ─────────────────────────────────────────────────

const PhoneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = "#e91e8c" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

// ─── Session row ──────────────────────────────────────────────────────────────

const SessionRow: React.FC<{ session: Session }> = ({ session }) => {
  const { date, time } = formatDate(session.date);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        background: hovered ? "#fff8fb" : "white",
        borderBottom: "1px solid #f9eef5",
        cursor: "pointer",
        transition: "background 0.15s ease",
        fontFamily: FONT,
      }}
    >
      {/* Left: icon + doctor name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <PhoneIcon size={17} color="#e91e8c" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#2d1a2e" }}>
          {session.doctorName}
        </span>
      </div>

      {/* Right: date + time */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{date}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af" }}>{time}</div>
      </div>
    </div>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", borderBottom: "1px solid #f9eef5",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f3e8f0" }} />
      <div style={{ width: 120, height: 14, borderRadius: 6, background: "#f3e8f0" }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{ width: 80, height: 12, borderRadius: 4, background: "#f3e8f0" }} />
      <div style={{ width: 50, height: 10, borderRadius: 4, background: "#f3e8f0" }} />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AllSessions: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Get filter parameters from URL
  const clinicianId = searchParams.get('clinician');
  const patientId = searchParams.get('patient');

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const queryParams = new URLSearchParams();
        if (clinicianId) queryParams.append('clinician', clinicianId);
        if (patientId) queryParams.append('patient', patientId);
        
        const res = await fetch(`/api/sessions?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch sessions');
        }
        
        const data = await res.json();
        setSessions(data.sessions);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        // Set empty array on error to prevent infinite loading
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user, clinicianId, patientId]);

  // ── Session list content (shared between mobile & desktop) ──────────────────

  const sessionList = (
    <div style={{
      background: "white",
      borderRadius: 18,
      border: "2px solid #f0d0e8",
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(233,30,140,0.07)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "2px solid #f0d0e8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#e91e8c", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Session History
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#cca0bb" }}>
          {loading ? "…" : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Rows */}
      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : sessions.length === 0 ? (
        <div style={{
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #fff0f6, #ffe0f0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <PhoneIcon size={24} color="#cca0bb" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#2d1a2e", margin: "0 0 4px" }}>
            No sessions yet
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af", margin: 0 }}>
            Your past appointments will appear here
          </p>
        </div>
      ) : (
        sessions.map((s) => <SessionRow key={s.id} session={s} />)
      )}
    </div>
  );

  // ── MOBILE ──────────────────────────────────────────────────────────────────

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: FONT }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>

          {/* Hero */}
          <div style={{
            background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
            paddingTop: 52, paddingBottom: 0, paddingLeft: 24, paddingRight: 24,
            position: "relative", overflow: "visible",
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBlock: 10 }}>
              <img src="/Logo.svg" alt="HealthSafe" style={{ height: 32 }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ color: "white", fontSize: 26, fontWeight: 900, margin: "0 0 4px", letterSpacing: -0.5, lineHeight: 1.1 }}>
                {clinicianId || patientId ? 'Filtered Sessions' : 'All Sessions'}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                {clinicianId || patientId ? 'Sessions for selected person' : 'Your appointment history'}
              </p>
            </div>
            <div style={{ marginBottom: -2, marginLeft: -24, marginRight: -24 }}>
              <WaveDivider color="white" />
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, background: "white", padding: "28px 16px 24px" }}>
            {sessionList}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────

  return (
    <div className="mt-10" style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: FONT, display: "flex", flexDirection: "column", background: "#fdf6fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

      {/* Hero */}
      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        padding: "48px 48px 0", position: "relative", overflow: "visible",
      }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
          <h1 style={{ color: "white", fontSize: 38, fontWeight: 900, margin: "0 0 8px", letterSpacing: -1.5, lineHeight: 1.05 }}>
            {clinicianId || patientId ? 'Filtered Sessions' : 'All Sessions'}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, margin: 0 }}>
            {clinicianId || patientId ? 'Sessions for selected person' : 'Your complete appointment history'}
          </p>
        </div>

        <div style={{ marginBottom: -2, marginLeft: -48, marginRight: -48 }}>
          <WideWave color="#fdf6fa" />
        </div>
      </section>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 800, width: "100%", margin: "0 auto", padding: "40px 48px" }}>
        {sessionList}
      </div>

      {/* Footer */}
      <footer style={{ background: "#2d1a2e", padding: "40px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/Logo.svg" alt="HealthSafe" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        </div>
      </footer>
    </div>
  );
};

export default AllSessions;
