import { useEffect, useState } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const MapPinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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


export default function HealthSafeNavbar({
  defaultActive = "current-room",
  onTabChange,
}: HealthSafeNavbarProps) {
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

  const [active, setActive] = useState(defaultActive);

  const handleSelect = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: isDesktop ? "auto" : 0,
        top: isDesktop ? 0 : "auto",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "row",
        justifyContent: isDesktop ? "flex-end" : "space-between",
        alignItems: "center",
        backgroundColor: "",
        boxShadow: isDesktop 
          ? "0 2px 12px rgba(0,0,0,0.06)" 
          : "0 -2px 12px rgba(0,0,0,0.06)",
        padding: isDesktop ? "12px 48px 8px" : "8px 0 12px",
        width: "100%",
        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
        zIndex: 50
      }}
      className="bg-gradient-to-r to-[#E73A8A] from-[#ED385A]"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              background: "none",
              border: "none",
              outline: "none",
              cursor: "pointer",
              padding: "4px 8px",
              color: isActive ? "white" : "#d0d0d0",
              transition: "color 0.2s ease",
              flex: 1,
              minWidth: 0,
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
                transform: isActive ? "scale(1.12)" : "scale(1)",
              }}
            >
              {item.icon}
            </span>
            
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.01em",
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}