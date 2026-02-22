import { LucideArrowLeft } from "lucide-react";
import { useState, useEffect, type CSSProperties, type MouseEvent, type ChangeEvent } from "react";
import { useNavigate, Link } from "react-router";
import { login } from "./lib/api";

// ─── Shared Components ────────────────────────────────────────────────────────

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

// ─── Input Field ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  delay?: number;
  visible: boolean;
  icon: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label, type = "text", placeholder, value, onChange,
  delay = 0, visible, icon,
}) => {
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `all 0.6s ease ${delay}s`,
    }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 700, color: "#e91e8c",
        marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase",
      }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `2px solid ${focused ? "#e91e8c" : "#f0d0e8"}`,
        borderRadius: 14, padding: "12px 16px", gap: 10,
        background: focused ? "#fff5fa" : "white",
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 4px 16px rgba(233,30,140,0.12)" : "none",
      }}>
        <span style={{ color: focused ? "#e91e8c" : "#cca0bb", flexShrink: 0 }}>{icon}</span>
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            border: "none", outline: "none", fontSize: 16,
            fontFamily: "'Nunito', 'Poppins', sans-serif",
            fontWeight: 600, color: "#2d1a2e", background: "transparent", width: "100%",
          }}
        />
      </div>
    </div>
  );
};

// ─── Eye Icon ─────────────────────────────────────────────────────────────────

const EyeIcon: React.FC<{ show: boolean; onClick: () => void; focused: boolean }> = ({ show, onClick, focused }) => (
  <button onClick={onClick} style={{
    background: "none", border: "none", cursor: "pointer", padding: 0,
    color: focused ? "#e91e8c" : "#cca0bb", display: "flex", alignItems: "center",
  }}>
    {show ? (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )}
  </button>
);

// ─── Password Field ───────────────────────────────────────────────────────────

interface PasswordFieldProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  delay?: number;
  visible: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ value, onChange, delay = 0, visible }) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: `all 0.6s ease ${delay}s`,
    }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 700, color: "#e91e8c",
        marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase",
      }}>
        Password
      </label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `2px solid ${focused ? "#e91e8c" : "#f0d0e8"}`,
        borderRadius: 14, padding: "12px 16px", gap: 10,
        background: focused ? "#fff5fa" : "white",
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 4px 16px rgba(233,30,140,0.12)" : "none",
      }}>
        <span style={{ color: focused ? "#e91e8c" : "#cca0bb", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            border: "none", outline: "none", fontSize: 16,
            fontFamily: "'Nunito', 'Poppins', sans-serif",
            fontWeight: 600, color: "#2d1a2e", background: "transparent", width: "100%",
          }}
        />
        <EyeIcon show={showPassword} onClick={() => setShowPassword(!showPassword)} focused={focused} />
      </div>
    </div>
  );
};

// ─── Social Buttons ───────────────────────────────────────────────────────────

const SocialButtons: React.FC<{ visible: boolean; delay: number }> = ({ visible, delay }) => (
  <div style={{
    display: "flex", gap: 12,
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s ease ${delay}s`,
  }}>
    {[
      {
        label: "Google",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        ),
      },
      {
        label: "Apple",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d1d1f">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        ),
      },
    ].map(({ label, icon }) => (
      <button key={label} style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, border: "2px solid #f0d0e8", borderRadius: 14, padding: "12px 0",
        background: "white", cursor: "pointer",
        fontFamily: "'Nunito', 'Poppins', sans-serif",
        fontSize: 15, fontWeight: 700, color: "#2d1a2e",
        transition: "border-color 0.2s, background 0.2s",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e91e8c"; e.currentTarget.style.background = "#fff5fa"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0d0e8"; e.currentTarget.style.background = "white"; }}
      >
        {icon} {label}
      </button>
    ))}
  </div>
);

// ─── Shared Form Fields ───────────────────────────────────────────────────────

interface LoginFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  visible: boolean;
  loading: boolean;
  error: string;
  handleLogin: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  email, setEmail, password, setPassword,
  visible, loading, error, handleLogin,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    <InputField
      label="Email" type="email" placeholder="Enter your email"
      value={email} onChange={(e) => setEmail(e.target.value)}
      delay={0.25} visible={visible}
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      }
    />

    <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} delay={0.35} visible={visible} />

    {/* Forgot password */}
    <div style={{ textAlign: "right", marginTop: -6, opacity: visible ? 1 : 0, transition: "all 0.6s ease 0.42s" }}>
      <button style={{
        background: "none", border: "none", color: "#e91e8c",
        fontSize: 14, fontWeight: 700, cursor: "pointer",
        fontFamily: "'Nunito', 'Poppins', sans-serif", transition: "opacity 0.2s",
      }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Forgot password?
      </button>
    </div>

    {error && (
      <div style={{
        background: "#fff5f8", border: "2px solid #ff4d7d",
        borderRadius: 14, padding: "12px 16px", color: "#ff4d7d", fontSize: 14, fontWeight: 600,
      }}>
        {error}
      </div>
    )}

    {/* Login button */}
    <button
      onClick={handleLogin} disabled={loading}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(233,30,140,0.45)"; }}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(233,30,140,0.35)"; }}
      style={{
        background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
        color: "white", border: "none", borderRadius: 50,
        padding: "16px 0", fontSize: 17, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3,
        boxShadow: "0 8px 24px rgba(233,30,140,0.35)",
        fontFamily: "'Nunito', 'Poppins', sans-serif", marginTop: 4,
        opacity: visible ? (loading ? 0.7 : 1) : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s ease 0.5s, box-shadow 0.2s, transform 0.2s",
      }}
    >
      {loading ? "Logging in..." : "Login"}
    </button>

    {/* Divider */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: visible ? 1 : 0, transition: "all 0.6s ease 0.58s" }}>
      <div style={{ flex: 1, height: 1, background: "#f0d0e8" }} />
      <span style={{ color: "#cca0bb", fontSize: 13, fontWeight: 700 }}>or continue with</span>
      <div style={{ flex: 1, height: 1, background: "#f0d0e8" }} />
    </div>

    <SocialButtons visible={visible} delay={0.65} />

    {/* Sign up link */}
    <div style={{ textAlign: "center", paddingTop: 8, opacity: visible ? 1 : 0, transition: "all 0.6s ease 0.72s" }}>
      <span style={{ color: "#9a7a99", fontSize: 14, fontWeight: 600 }}>Don't have an account? </span>
      <Link to="/signup" style={{
        color: "#e91e8c", fontSize: 14, fontWeight: 800,
        textDecoration: "none", fontFamily: "'Nunito', 'Poppins', sans-serif",
      }}>Sign Up</Link>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const HealthSafeLogin: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => { clearTimeout(t); window.removeEventListener("resize", checkDesktop); };
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const formProps = { email, setEmail, password, setPassword, visible, loading, error, handleLogin };

  // ── Mobile ──────────────────────────────────────────────────────────────────

  if (!isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>

          {/* Hero */}
          <div style={{
            background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
            paddingTop: 60, paddingBottom: 0, paddingLeft: 30, paddingRight: 30,
            position: "relative", overflow: "visible",
          }}>
            <div style={{ height: 24 }} />
            <Link to="/" className="absolute top-8 left-5">
              <LucideArrowLeft color="white" size={35} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 800, color: "white" }}>
              <img src="/Logo.svg" alt="HealthSafe" />
            </div>
            <div style={{
              marginTop: 20, marginBottom: 28,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.6s ease 0.1s",
            }}>
              <div className="font-sf-semibold text-2xl text-white">Welcome Back!</div>
              <div className="font-sf-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>Sign in to your account</div>
            </div>
            <div style={{ marginBottom: -2, marginLeft: -30, marginRight: -30 }}>
              <WaveDivider color="white" />
            </div>
          </div>

          {/* Form */}
          <div style={{ flex: 1, background: "white", padding: "32px 28px 28px" }}>
            <LoginForm {...formProps} />
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
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "'Nunito', 'Poppins', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

      {/* Main split layout */}
      <div style={{ flex: 1, display: "flex", minHeight: "calc(100vh - 68px)" }}>

        {/* Left — gradient panel */}
        <div style={{
          width: "50%", flexShrink: 0,
          background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "60px 64px", position: "relative", overflow: "hidden",
        }}>
          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "40%", right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          <div style={{
            maxWidth: 420, width: "100%",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.7s ease",
          }}>
            <img src="/Logo.svg" alt="HealthSafe" style={{ height: 54, marginBottom: 36 }} />

            <h1 style={{
              fontSize: "clamp(32px, 3.5vw, 52px)", fontFamily: "SF-Pro-Display-Semibold", color: "white",
              margin: "0 0 18px", lineHeight: 1.08, letterSpacing: -2,
            }}>
              Welcome<br />back!
            </h1>
            <p style={{
              fontSize: 17, color: "rgba(255,255,255,0.85)", fontFamily: "SF-Pro-Display-Semibold",
              margin: "0 0 40px", lineHeight: 1.65, maxWidth: 360,
            }}>
              Sign in to manage your health records, appointments, and care — all in one place.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "SF-Pro-Display-Semibold" }}>
              <img src="/LoginPageGraphic.svg"/>
            </div>
          </div>
        </div>

        {/* Right — form panel */}
        <div style={{
          fontFamily: "SF-Pro-Display-Semibold",
          flex: 1, background: "#fdf6fa",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "60px 48px",
        }}>
          <div style={{
            width: "100%", maxWidth: 440,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease 0.15s",
          }}>
            {/* Back link */}
            <Link to="/" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#cca0bb", fontSize: 14, fontWeight: 700, textDecoration: "none",
              marginBottom: 32, transition: "color 0.2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e91e8c")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#cca0bb")}
            >
              <LucideArrowLeft size={16} />
              Back to home
            </Link>

            <h2 style={{ fontSize: 30, fontFamily: "SF-Pro-Display-Semibold", color: "#2d1a2e", margin: "0 0 6px", letterSpacing: -1 }}>
              Login
            </h2>
            <p style={{ fontSize: 15, color: "#9a7a99", fontFamily: "SF-Pro-Display-Semibold", margin: "0 0 32px" }}>
              Enter your credentials to access your account
            </p>

            {/* White card */}
            <div style={{
              background: "white", borderRadius: 24, padding: "32px 28px",
              boxShadow: "0 8px 40px rgba(233,30,140,0.08), 0 2px 8px rgba(233,30,140,0.04)",
              border: "1px solid #f5e0ef",
            }}>
              <LoginForm {...formProps} />
            </div>
          </div>
        </div>
      </div>
      
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
};

export default HealthSafeLogin;