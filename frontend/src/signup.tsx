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
    <>
    <div className="h-[1px] w-full bg-linear-gradient(135deg, #fff0f6, #ffe0f0)">

    </div>
    <div className="mt-5" 
    style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
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
    </>
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

// ─── Main Sign Up Screen ──────────────────────────────────────────────────────

const HealthSafeSignUp: React.FC = () => {
  const [visible, setVisible] = useState(false);
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
    return () => clearTimeout(t);
  }, []);

  const errors = submitted
    ? {
        fullName: !fullName ? "Full name is required" : "",
        email: !email ? "Email is required" : !/\S+@\S+\.\S+/.test(email) ? "Invalid email" : "",
        confirmPassword:
          confirmPassword && confirmPassword !== password ? "Passwords don't match" : "",
        role: !role ? "Please select a role" : "",
      }
    : { fullName: "", email: "", confirmPassword: "", role: "", agreed: "" };

  const handleSignUp = async (e: MouseEvent<HTMLButtonElement>) => {
    setSubmitted(true);
    setApiError("");
    e.currentTarget.style.transform = "scale(0.98)";
    setTimeout(() => {
      if (e.currentTarget) e.currentTarget.style.transform = "scale(1)";
    }, 150);

    // Check for validation errors
    if (!fullName || !email || !role || !/\S+@\S+\.\S+/.test(email) || (confirmPassword && confirmPassword !== password)) {
      return;
    }

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

  return (
    <div style={{
      minHeight: "100vh", background: "#f0f0f0",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />

      <div style={{
      }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(160deg, #ff4d7d 0%, #ff2d6a 40%, #e91e8c 100%)",
          paddingTop: 60, paddingBottom: 0, paddingLeft: 30, paddingRight: 30,
          position: "relative", overflow: "visible",
        }}>
          <div style={{ height: 24 }} />
            <Link to="/" className="absolute top-8 left-5">
              <LucideArrowLeft color="white" size={35}/>
            </Link>
          {/* Top row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s ease",
          }}>

            <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 800, color: "white" }}>
                <img src="/Logo.svg"/>
            </div>
          </div>

          {/* Heading */}
          <div style={{
            marginTop: 18, marginBottom: 24,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.6s ease 0.1s",
          }}>
            <div className="font-sf-semibold text-2xl text-white">
              Create Your Account
            </div>
            <div className="font-sf-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
              
            </div>
          </div>

          <div style={{ marginBottom: -2, marginLeft: -30, marginRight: -30 }}>
            <WaveDivider color="white" />
          </div>
        </div>

        {/* Form */}
        <div style={{
          flex: 1, background: "white",
          padding: "28px 28px 24px",
          display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto",
        }}>

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
          {submitted && errors.agreed && (
            <p style={{ margin: "-8px 0 0 30px", fontSize: 12, color: "#ff4d7d", fontWeight: 600 }}>
              {errors.agreed}
            </p>
          )}

          {/* API Error message */}
          {apiError && (
            <div
              style={{
                background: "#fff5f8",
                border: "2px solid #ff4d7d",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#ff4d7d",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {apiError}
            </div>
          )}

          {/* Create Account button */}
          <button
            onClick={handleSignUp}
            disabled={loading}
            onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(233,30,140,0.45)";
            }}
            onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(233,30,140,0.35)";
            }}
            style={{
              background: "linear-gradient(135deg, #ff4d7d, #e91e8c)",
              color: "white", border: "none", borderRadius: 50,
              padding: "16px 0", fontSize: 17, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3,
              boxShadow: "0 8px 24px rgba(233,30,140,0.35)",
              fontFamily: "'Nunito', 'Poppins', sans-serif",
              marginTop: 4,
              opacity: visible ? (loading ? 0.7 : 1) : 0,
              transform: visible ? "translateY(0)" : "translateY(18px)",
              transition: "opacity 0.55s ease 0.68s, transform 0.55s ease 0.68s, box-shadow 0.2s",
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {/* Login link */}
          <div style={{
            textAlign: "center", paddingTop: 2,
            opacity: visible ? 1 : 0,
            transition: "all 0.55s ease 0.74s",
          }}>
            <span style={{ color: "#9a7a99", fontSize: 14, fontWeight: 600 }}>
              Already have an account?{" "}
            </span>
            <Link
              to="/login"
              style={{
                background: "none", border: "none", color: "#e91e8c",
                fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "'Nunito', 'Poppins', sans-serif",
                textDecoration: "none",
              }}
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Footer wave */}
        <div style={{
          position: "relative", height: 60,
          background: "linear-gradient(160deg, #ff4d7d 0%, #e91e8c 100%)",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <WaveDivider color="white" flip={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthSafeSignUp;