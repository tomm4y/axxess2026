import { LucideArrowLeft } from "lucide-react";
import { useState, useEffect, type CSSProperties, type MouseEvent, type ChangeEvent } from "react";
import { useNavigate, Link } from "react-router";
import { signup } from "./lib/api";

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

// ─── Field Components ─────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "#e91e8c", marginBottom: 5, letterSpacing: 0.5,
  textTransform: "uppercase",
};

const inputBaseStyle: CSSProperties = {
  border: "none", outline: "none", fontSize: 15,
  fontFamily: "'Nunito', 'Poppins', sans-serif",
  fontWeight: 600, color: "#2d1a2e",
  background: "transparent", width: "100%",
};

interface FieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  visible: boolean;
  delay?: number;
  error?: string;
}

const Field: React.FC<FieldProps> = ({
  label, type = "text", placeholder, value, onChange,
  icon, visible, delay = 0, error,
}) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#ff4d7d" : focused ? "#e91e8c" : "#f0d0e8";
  const bg = error ? "#fff5f8" : focused ? "#fff5fa" : "white";

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
      <label style={labelStyle}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `2px solid ${borderColor}`,
        borderRadius: 14, padding: "11px 14px", gap: 10,
        background: bg, transition: "all 0.2s ease",
        boxShadow: focused ? "0 4px 16px rgba(233,30,140,0.12)" : "none",
      }}>
        <span style={{ color: error ? "#ff4d7d" : focused ? "#e91e8c" : "#cca0bb", flexShrink: 0 }}>
          {icon}
        </span>
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputBaseStyle}
        />
      </div>
      {error && (
        <p style={{ margin: "4px 0 0 4px", fontSize: 12, color: "#ff4d7d", fontWeight: 600 }}>
          {error}
        </p>
      )}
    </div>
  );
};

interface PasswordFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  delay?: number;
  error?: string;
  strengthBar?: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label = "Password", placeholder = "Create a password",
  value, onChange, visible, delay = 0, error, strengthBar = false,
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const getStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(value);
  const strengthColors = ["#ff4d7d", "#ff9f4d", "#ffd54d", "#4ddf91"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const borderColor = error ? "#ff4d7d" : focused ? "#e91e8c" : "#f0d0e8";
  const bg = error ? "#fff5f8" : focused ? "#fff5fa" : "white";

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
      <label style={labelStyle}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `2px solid ${borderColor}`,
        borderRadius: 14, padding: "11px 14px", gap: 10,
        background: bg, transition: "all 0.2s ease",
        boxShadow: focused ? "0 4px 16px rgba(233,30,140,0.12)" : "none",
      }}>
        <span style={{ color: error ? "#ff4d7d" : focused ? "#e91e8c" : "#cca0bb", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <input
          type={show ? "text" : "password"} placeholder={placeholder} value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputBaseStyle}
        />
        <button onClick={() => setShow(!show)} style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: focused ? "#e91e8c" : "#cca0bb", display: "flex", alignItems: "center", flexShrink: 0,
        }}>
          {show ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p style={{ margin: "4px 0 0 4px", fontSize: 12, color: "#ff4d7d", fontWeight: 600 }}>
          {error}
        </p>
      )}
      {strengthBar && value.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 4,
                background: i < strength ? strengthColors[strength - 1] : "#f0d0e8",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>
          <p style={{
            margin: "4px 0 0", fontSize: 12, fontWeight: 700,
            color: strength > 0 ? strengthColors[strength - 1] : "#cca0bb",
            transition: "color 0.3s ease",
          }}>
            {strength > 0 ? strengthLabels[strength - 1] : ""}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Role Selector ────────────────────────────────────────────────────────────

type Role = "patient" | "doctor" | null;

interface RoleSelectorProps {
  selected: Role;
  onChange: (role: Role) => void;
  visible: boolean;
  delay?: number;
  error?: string;
}

const PatientIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DoctorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
);

const RoleSelector: React.FC<RoleSelectorProps> = ({ selected, onChange, visible, delay = 0, error }) => {
  const roles: { key: Role; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: "patient", label: "I'm a Patient", desc: "Manage my health records", icon: <PatientIcon /> },
    { key: "doctor", label: "I'm a Doctor", desc: "Manage my patients", icon: <DoctorIcon /> },
  ];

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
      <div style={{ height: 1, background: "#f0d0e8", marginBottom: 20 }} />
      <label style={labelStyle}>I am a</label>
      <div style={{ display: "flex", gap: 10 }}>
        {roles.map(({ key, label, desc, icon }) => {
          const isSelected = selected === key;
          return (
            <div
              key={key}
              onClick={() => onChange(key)}
              style={{
                flex: 1, cursor: "pointer", borderRadius: 16, padding: "14px 12px",
                border: `2px solid ${isSelected ? "#e91e8c" : "#f0d0e8"}`,
                background: isSelected ? "linear-gradient(135deg, #fff0f6, #ffe0f0)" : "white",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 4px 16px rgba(233,30,140,0.18)" : "none",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: isSelected ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "#f9eef5",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isSelected ? "white" : "#cca0bb",
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 4px 12px rgba(233,30,140,0.3)" : "none",
              }}>
                {icon}
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "#e91e8c" : "#2d1a2e", transition: "color 0.2s" }}>
                {label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#e97db0" : "#cca0bb", textAlign: "center", lineHeight: 1.3 }}>
                {desc}
              </span>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", marginTop: 2,
                border: `2px solid ${isSelected ? "#e91e8c" : "#f0d0e8"}`,
                background: isSelected ? "linear-gradient(135deg, #ff4d7d, #e91e8c)" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 2px 8px rgba(233,30,140,0.3)" : "none",
              }}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p style={{ margin: "6px 0 0 4px", fontSize: 12, color: "#ff4d7d", fontWeight: 600 }}>{error}</p>
      )}
    </div>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// ─── Shared Form ──────────────────────────────────────────────────────────────

interface SignUpFormProps {
  fullName: string; setFullName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  role: Role; setRole: (r: Role) => void;
  visible: boolean; loading: boolean;
  errors: Record<string, string>;
  apiError: string;
  handleSignUp: (e: MouseEvent<HTMLButtonElement>) => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  fullName, setFullName, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  role, setRole, visible, loading, errors, apiError, handleSignUp,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <Field
      label="Full Name" placeholder="Enter your full name"
      value={fullName} onChange={(e) => setFullName(e.target.value)}
      icon={<UserIcon />} visible={visible} delay={0.2}
      error={errors.fullName}
    />
    <Field
      label="Email Address" type="email" placeholder="Enter your email"
      value={email} onChange={(e) => setEmail(e.target.value)}
      icon={<EmailIcon />} visible={visible} delay={0.28}
      error={errors.email}
    />
    <PasswordField
      value={password} onChange={(e) => setPassword(e.target.value)}
      visible={visible} delay={0.44} strengthBar
    />
    <PasswordField
      label="Confirm Password" placeholder="Re-enter your password"
      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
      visible={visible} delay={0.52}
      error={errors.confirmPassword}
    />
    <RoleSelector
      selected={role} onChange={setRole}
      visible={visible} delay={0.6}
      error={errors.role}
    />

    {apiError && (
      <div style={{
        background: "#fff5f8", border: "2px solid #ff4d7d",
        borderRadius: 14, padding: "12px 16px", color: "#ff4d7d", fontSize: 14, fontWeight: 600,
      }}>
        {apiError}
      </div>
    )}

    <button
      onClick={handleSignUp}
      disabled={loading}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.boxShadow = "0 12px 32px rgba(233,30,140,0.45)"; }}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(233,30,140,0.35)"; }}
      style={{
        background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
        color: "white", border: "none", borderRadius: 50,
        padding: "16px 0", fontSize: 17, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3,
        boxShadow: "0 8px 24px rgba(233,30,140,0.35)",
        fontFamily: "'Nunito', 'Poppins', sans-serif", marginTop: 4,
        opacity: visible ? (loading ? 0.7 : 1) : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.55s ease 0.68s, transform 0.55s ease 0.68s, box-shadow 0.2s",
      }}
    >
      {loading ? "Creating account..." : "Create Account"}
    </button>

    <div style={{ textAlign: "center", paddingTop: 2, opacity: visible ? 1 : 0, transition: "all 0.55s ease 0.74s" }}>
      <span style={{ color: "#9a7a99", fontSize: 14, fontWeight: 600 }}>Already have an account? </span>
      <Link to="/login" style={{
        color: "#e91e8c", fontSize: 14, fontWeight: 800,
        textDecoration: "none", fontFamily: "'Nunito', 'Poppins', sans-serif",
      }}>Log In</Link>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const HealthSafeSignUp: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => { clearTimeout(t); window.removeEventListener("resize", checkDesktop); };
  }, []);

  const errors = submitted
    ? {
        fullName: !fullName ? "Full name is required" : "",
        email: !email ? "Email is required" : !/\S+@\S+\.\S+/.test(email) ? "Invalid email" : "",
        confirmPassword: confirmPassword && confirmPassword !== password ? "Passwords don't match" : "",
        role: !role ? "Please select a role" : "",
      }
    : { fullName: "", email: "", confirmPassword: "", role: "" };

  const handleSignUp = async (e: MouseEvent<HTMLButtonElement>) => {
    setSubmitted(true);
    setApiError("");
    e.currentTarget.style.transform = "scale(0.98)";
    setTimeout(() => { if (e.currentTarget) e.currentTarget.style.transform = "scale(1)"; }, 150);
    if (!fullName || !email || !role || !/\S+@\S+\.\S+/.test(email) || (confirmPassword && confirmPassword !== password)) return;
    setLoading(true);
    try {
      await signup(email, password, fullName, role === "doctor");
      navigate("/login");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const formProps = {
    fullName, setFullName, email, setEmail,
    password, setPassword, confirmPassword, setConfirmPassword,
    role, setRole, visible, loading, errors, apiError, handleSignUp,
  };

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
              marginTop: 18, marginBottom: 24,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.6s ease 0.1s",
            }}>
              <div className="font-sf-semibold text-2xl text-white">Create Your Account</div>
            </div>
            <div style={{ marginBottom: -2, marginLeft: -30, marginRight: -30 }}>
              <WaveDivider color="white" />
            </div>
          </div>

          {/* Form */}
          <div style={{ flex: 1, background: "white", padding: "28px 28px 24px", overflowY: "auto" }}>
            <SignUpForm {...formProps} />
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
    <div style={{ minHeight: "100vh", minWidth: "100vw", fontFamily: "SF-Pro-Display-Semibold, sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

      {/* Main split layout */}
      <div style={{ flex: 1, display: "flex", minHeight: "calc(100vh - 68px)" }}>

        {/* Left — gradient panel */}
        <div style={{
          width: "45%", flexShrink: 0,
          background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 45%, #e91e8c 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "60px 64px", position: "relative", overflow: "hidden",
        }}>
          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "50%", right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          <div style={{
            maxWidth: 400, width: "100%",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.7s ease",
          }}>
            <img src="/Logo.svg" alt="HealthSafe" style={{ height: 54, marginBottom: 32 }} />

            <h1 style={{
              fontSize: "clamp(28px, 3vw, 46px)", fontWeight: 900, color: "white",
              margin: "0 0 16px", lineHeight: 1.1, letterSpacing: -1.5,
            }}>
              Join HealthSafe<br />today!
            </h1>
            <p style={{
              fontSize: 16, color: "rgba(255,255,255,0.85)", fontWeight: 600,
              margin: "0 0 36px", lineHeight: 1.65, maxWidth: 340,
            }}>
              Create your account to manage health records, connect with doctors, and take control of your wellness.
            </p>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { step: "1", title: "Create your profile", desc: "Fill in your details and choose your role" },
                { step: "2", title: "Verify your account", desc: "We'll send a quick confirmation to your email" },
                { step: "3", title: "Start your journey", desc: "Access your dashboard and all features instantly" },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 900, color: "white",
                  }}>{step}</div>
                  <div>
                    <div style={{ color: "white", fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{title}</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10" style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "SF-Pro-Display-Semibold" }}>
              <img src="/LoginPageGraphic.svg"/>
            </div>

          </div>
        </div>

        {/* Right — form panel */}
        <div style={{
          flex: 1, background: "#fdf6fa",
          display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center",
          padding: "48px 48px 48px",
          overflowY: "auto",
        }}>
          <div style={{
            width: "100%", maxWidth: 480,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease 0.15s",
          }}>
            {/* Back link */}
            <Link to="/" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#cca0bb", fontSize: 14, fontWeight: 700, textDecoration: "none",
              marginBottom: 28, transition: "color 0.2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e91e8c")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#cca0bb")}
            >
              <LucideArrowLeft size={16} />
              Back to home
            </Link>

            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#2d1a2e", margin: "0 0 4px", letterSpacing: -1 }}>
              Create your account
            </h2>
            <p style={{ fontSize: 14, color: "#9a7a99", fontWeight: 600, margin: "0 0 28px" }}>
              Fill in the details below to get started
            </p>

            {/* White card */}
            <div style={{
              background: "white", borderRadius: 24, padding: "28px 28px",
              boxShadow: "0 8px 40px rgba(233,30,140,0.08), 0 2px 8px rgba(233,30,140,0.04)",
              border: "1px solid #f5e0ef",
            }}>
              <SignUpForm {...formProps} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthSafeSignUp;