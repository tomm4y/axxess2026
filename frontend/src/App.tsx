import { useState, useEffect, type CSSProperties, type MouseEvent } from "react";
import { Link } from "react-router";

interface WaveDividerProps {
  flip?: boolean;
  color?: string;
}

const WaveDivider: React.FC<WaveDividerProps> = ({ flip = false, color = "white" }) => (
  <svg
    viewBox="0 0 400 60"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      display: "block",
      width: "calc(100% + 2px)",
      marginLeft: -1,
      transform: flip ? "scaleY(-1)" : "none",
    }}
    preserveAspectRatio="none"
    height="60"
  >
    <path
      d="M-10,20 C40,55 100,5 160,28 C220,51 270,5 330,28 C370,43 390,18 410,22 L410,60 L-10,60 Z"
      fill={color}
    />
  </svg>
);

// Full-width wave for desktop hero
const WideWave: React.FC<{ color?: string; flip?: boolean }> = ({ color = "white", flip = false }) => (
  <svg
    viewBox="0 0 1440 80"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      display: "block",
      width: "calc(100% + 4px)",
      marginLeft: -2,
      transform: flip ? "scaleY(-1)" : "none",
    }}
    preserveAspectRatio="none"
    height="80"
  >
    <path
      d="M-10,40 C120,80 240,0 400,40 C560,80 680,5 840,38 C1000,70 1120,10 1280,42 C1380,62 1420,30 1450,38 L1450,80 L-10,80 Z"
      fill={color}
    />
  </svg>
);

const App: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);

    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", checkDesktop);
    };
  }, []);

  // ── Shared button handlers ──────────────────────────────────────────────────

  const handleLoginMouseEnter = (e: MouseEvent<HTMLAnchorElement>): void => {
    e.currentTarget.style.transform = "scale(1.02)";
    e.currentTarget.style.boxShadow = "0 12px 32px rgba(233,30,140,0.45)";
  };

  const handleLoginMouseLeave = (e: MouseEvent<HTMLAnchorElement>): void => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(233,30,140,0.35)";
  };

  const handleCreateMouseEnter = (e: MouseEvent<HTMLAnchorElement>): void => {
    e.currentTarget.style.background = "#fff0f6";
  };

  const handleCreateMouseLeave = (e: MouseEvent<HTMLAnchorElement>): void => {
    e.currentTarget.style.background = "white";
  };

  // ── Shared fade-in style helper ─────────────────────────────────────────────

  const fadeIn = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease ${delay}s`,
  });

  // ── Mobile view ─────────────────────────────────────────────────────────────

  const mobileView = (
    <div style={{ minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
          paddingTop: 70, paddingBottom: 0, paddingLeft: 30, paddingRight: 30,
          position: "relative", minHeight: 320, overflow: "visible",
        }}>
          <div style={{ height: 30 }} />
          <div style={{
            color: "white", fontSize: 36,
            fontFamily: "SF-Pro-Display-Regular, 'Nunito', sans-serif",
            fontWeight: 800, lineHeight: 1.15, margin: "20px 0 0",
            letterSpacing: -0.5, ...fadeIn(0),
          }}>
            Welcome To
            <div>
              <img src="/Logo.svg" alt="HealthSafe" />
            </div>
          </div>
          <div style={{
            color: "rgba(255,255,255,0.85)", fontSize: 17,
            fontFamily: "SF-Pro-Display-Regular, 'Nunito', sans-serif",
            marginTop: 12, marginBottom: 30, ...fadeIn(0.15),
          }}>
            Manage your health, smarter.
          </div>
          <div style={{ marginBottom: -2, marginLeft: -30, marginRight: -30 }}>
            <WaveDivider color="white" />
          </div>
        </div>

        <div className="bg-white text-center flex flex-col px-10 items-center justify-center">
          <h1 className="text-md font-sf-semibold text-gray-500">
            Manage your health smarter — with records, appointments, prescriptions, and care all in one place.
          </h1>
        </div>

        {/* Buttons */}
        <div style={{ flex: 1, background: "white", padding: "40px 32px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Link
            to="/login"
            onMouseEnter={handleLoginMouseEnter}
            onMouseLeave={handleLoginMouseLeave}
            style={{
              display: "block", width: "100%", textAlign: "center",
              padding: "16px 0", borderRadius: 50, fontSize: 17, fontWeight: 700,
              color: "white", textDecoration: "none",
              background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
              boxShadow: "0 8px 24px rgba(233,30,140,0.35)",
              fontFamily: "'Nunito', sans-serif",
              transition: "box-shadow 0.2s, transform 0.2s",
              ...fadeIn(0.3),
            }}
          >
            Login
          </Link>
          <Link
            to="/signup"
            onMouseEnter={handleCreateMouseEnter}
            onMouseLeave={handleCreateMouseLeave}
            style={{
              display: "block", width: "100%", textAlign: "center",
              padding: "15px 0", borderRadius: 50, fontSize: 17, fontWeight: 700,
              color: "#e91e8c", textDecoration: "none",
              background: "white", border: "2px solid #e91e8c",
              fontFamily: "'Nunito', sans-serif",
              transition: "background 0.2s",
              ...fadeIn(0.42),
            }}
          >
            Create Account
          </Link>
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

  // ── Desktop view ────────────────────────────────────────────────────────────

  const desktopView = (
    <div style={{ minHeight: "100vh", minWidth: "100vw", background: "#fdf6fa", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

      {/* Hero */}
      <section style={{
        background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
        paddingTop: 90, paddingLeft: 48, paddingRight: 48, paddingBottom: 0,
        position: "relative", overflow: "visible",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -60, left: -80, width: 340, height: 340, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 40, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", paddingBottom: 80 }}>
          {/* Left: copy */}
          <div>

            <div style={{ ...fadeIn(0.1) }}>
              <img src="/Logo.svg" alt="HealthSafe" style={{ height: 62, marginBottom: 20 }} />
            </div>

            <h1 className="font-sf-semibold" style={{
              fontSize: "clamp(36px, 4vw, 58px)", fontWeight: 900, color: "white",
              margin: "0 0 20px", lineHeight: 1.07, letterSpacing: -2,
              ...fadeIn(0.18),
            }}>
              Your health,<br />beautifully managed.
            </h1>

            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.88)", fontWeight: 600,
              margin: "0 0 40px", lineHeight: 1.65, maxWidth: 460,
              ...fadeIn(0.26),
            }}>
              Manage your health smarter — with records, appointments, prescriptions, and care all in one place.
            </p>

            <div style={{ display: "flex", gap: 14, ...fadeIn(0.34) }}>
              <Link to="/signup" style={{
                padding: "16px 38px", borderRadius: 50, fontSize: 17, fontFamily: "SF-Pro-Display-Semibold",
                color: "#e91e8c", textDecoration: "none", background: "white",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)"; }}
              >Create Free Account</Link>
              <Link to="/login" style={{
                padding: "14px 32px", borderRadius: 50, fontSize: 17, fontFamily: "SF-Pro-Display-Semibold",
                color: "white", textDecoration: "none",
                background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.5)",
                transition: "background 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
              >Log In →</Link>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", ...fadeIn(0.5) }}>
              <img src="/LandingPageGraphic.svg" className="w-125"/>
          </div>
        </div>

        <div style={{ marginBottom: -2, marginLeft: -48, marginRight: -48 }}>
          <WideWave color="#fdf6fa" />
        </div>
      </section>

      {/* Features strip */}
      <section style={{ padding: "80px 48px", background: "#fdf6fa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56, ...fadeIn(0) }}>
            <div style={{
              display: "inline-block", background: "linear-gradient(135deg, #ffe0f0, #ffd0e8)",
              color: "#e91e8c", fontSize: 12, fontFamily: "SF-Pro-Display-Semibold", letterSpacing: 1,
              textTransform: "uppercase", padding: "6px 16px", borderRadius: 50, marginBottom: 16,
            }}>Everything you need</div>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 44px)", fontFamily: "SF-Pro-Display-Semibold, sans-serif", color: "#2d1a2e", margin: "0 0 12px", letterSpacing: -1.5 }}>
              Healthcare, reimagined.
            </h2>
            <p className="font-sf-semibold" style={{ fontSize: 16, color: "#9a7a99", fontWeight: 600, maxWidth: 460, margin: "0 auto", lineHeight: 1.65 }}>
              Whether you're a patient or a doctor, HealthSafe has you covered.
            </p>
          </div>

          <div className="font-sf-semibold" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {[
              { title: "Smart Records", desc: "All your medical history in one secure place.", emoji: "📋" },
              { title: "Doctor Connect", desc: "Book appointments and message your care team.", emoji: "👨‍⚕️" },
              { title: "Real-Time Monitoring", desc: "Track vitals and health goals with ease.", emoji: "📈" },
              { title: "Secure & Private", desc: "Bank-grade encryption keeps your data safe.", emoji: "🔒" },
              { title: "Real-Time Transcription", desc: "Never misremember a session with your client or clinician.", emoji: "📄" },
              { title: "24/7 Support", desc: "Health advisors always on-call.", emoji: "💬" },
            ].map(({ title, desc, emoji }, i) => {
              const [hovered, setHovered] = useState(false);
              return (
                <div key={title}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                  style={{
                    background: hovered ? "linear-gradient(135deg, #fff0f6, #ffe0f0)" : "white",
                    border: `2px solid ${hovered ? "#e91e8c" : "#f0d0e8"}`,
                    borderRadius: 20, padding: "26px 24px",
                    transition: "all 0.22s ease",
                    boxShadow: hovered ? "0 10px 36px rgba(233,30,140,0.14)" : "0 2px 10px rgba(233,30,140,0.05)",
                    cursor: "default",
                  }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, fontSize: 22,
                    background: hovered ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "#fff0f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16, transition: "all 0.22s ease",
                  }}>{emoji}</div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "#2d1a2e", letterSpacing: -0.3 }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#9a7a99", lineHeight: 1.6, fontWeight: 600 }}>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#2d1a2e", padding: "40px 48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <img src="/Logo.svg" alt="HealthSafe" style={{ height: 28, filter: "brightness(0) invert(1)" }} />

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600, margin: 0 }}>
            © 2026 HealthSafe. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );

  return isDesktop ? desktopView : mobileView;
};

export default App;