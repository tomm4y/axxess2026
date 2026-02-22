import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const MapPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 2h2v8h8v2h-8v8h-2v-8H3v-2h8V2z" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { id: "current-room", label: "Current Room", icon: <MapPinIcon /> },
  { id: "all-sessions", label: "All Sessions", icon: <BookmarkIcon /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

interface HealthSafeNavbarProps {
  defaultActive?: string;
  onTabChange?: (id: string) => void;
}

const GRADIENT = "linear-gradient(90deg, #ED385A 0%, #E73A8A 100%)";
const FONT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif";

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function HealthSafeNavbar({
  defaultActive = "current-room",
  onTabChange,
}: HealthSafeNavbarProps) {
  const [active, setActive] = useState(defaultActive);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const TAB_ROUTES: Record<string, string> = {
    "current-room": "/dashboard",
    "all-sessions": "/sessions",
  };

  const handleSelect = (id: string) => {
    if (id === "settings") {
      setSettingsOpen((prev) => !prev);
      return;
    }
    setSettingsOpen(false);
    setActive(id);
    onTabChange?.(id);
    if (TAB_ROUTES[id]) {
      navigate(TAB_ROUTES[id]);
    }
  };

  // ── DESKTOP TOP NAVBAR ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: GRADIENT,
          boxShadow: "0 2px 20px rgba(231,58,138,0.3)",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div
            onClick={() => { setActive("current-room"); navigate("/dashboard"); }}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <img className="w-50" src="/Logo.svg"/>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              const isSettings = item.id === "settings";

              const btn = (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.13)";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(255,255,255,0.68)";
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: (isSettings ? settingsOpen : isActive) ? "rgba(255,255,255,0.22)" : "transparent",
                    border: "none",
                    borderRadius: 9,
                    cursor: "pointer",
                    padding: "9px 18px",
                    color: (isSettings ? settingsOpen : isActive) ? "white" : "rgba(255,255,255,0.68)",
                    fontSize: 14,
                    fontWeight: (isSettings ? settingsOpen : isActive) ? 600 : 400,
                    fontFamily: FONT,
                    letterSpacing: "0.01em",
                    outline: 'none',
                    transition: "background 0.16s ease, color 0.16s ease",
                    whiteSpace: "nowrap",
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </button>
              );

              if (isSettings) {
                return (
                  <div key={item.id} ref={settingsRef} style={{ position: "relative" }}>
                    {btn}
                    {settingsOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          right: 0,
                          background: "white",
                          borderRadius: 12,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                          minWidth: 180,
                          overflow: "hidden",
                          zIndex: 100,
                          fontFamily: FONT,
                        }}
                      >
                        <button
                          onClick={handleSignOut}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fff0f6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "12px 16px",
                            background: "white",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#e91e8c",
                            fontFamily: FONT,
                            transition: "background 0.15s ease",
                          }}
                        >
                          <LogOutIcon />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return btn;
            })}
          </div>
        </div>


      </nav>
    );
  }

  // ── MOBILE BOTTOM NAVBAR ────────────────────────────────────────
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: GRADIENT,
        boxShadow: "0 -2px 16px rgba(231,58,138,0.2)",
        display: "flex",
        alignItems: "center",
        padding: "8px 0 12px",
        fontFamily: FONT,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        const isSettings = item.id === "settings";

        const btn = (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              outline: "none",
              cursor: "pointer",
              padding: "4px 8px",
              color: (isSettings ? settingsOpen : isActive) ? "white" : "rgba(255,255,255,0.6)",
              transition: "color 0.2s ease",
              flex: 1,
              minWidth: 0,
              fontFamily: FONT,
            }}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s ease",
                transform: (isSettings ? settingsOpen : isActive) ? "scale(1.15)" : "scale(1)",
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: (isSettings ? settingsOpen : isActive) ? 600 : 400,
                letterSpacing: "0.01em",
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </button>
        );

        if (isSettings) {
          return (
            <div key={item.id} ref={settingsRef} style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
              {btn}
              {settingsOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 12px)",
                    right: 0,
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    minWidth: 170,
                    overflow: "hidden",
                    zIndex: 100,
                    fontFamily: FONT,
                  }}
                >
                  <button
                    onClick={handleSignOut}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fff0f6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "12px 16px",
                      background: "white",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#e91e8c",
                      fontFamily: FONT,
                      transition: "background 0.15s ease",
                    }}
                  >
                    <LogOutIcon />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          );
        }

        return btn;
      })}
    </nav>
  );
}