import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { NewGame } from "./pages/NewGame";
import { Play } from "./pages/Play";
import { Games } from "./pages/Games";
import { Review } from "./pages/Review";
import { Profile } from "./pages/Profile";
import { SettingsPage } from "./pages/Settings";
import { Icon } from "./components/Icon";
import { QuickToggles } from "./components/QuickToggles";
import { PieceSvg } from "./components/Piece";

const NAV = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/new", label: "Play", icon: "play" },
  { to: "/games", label: "Games", icon: "games" },
  { to: "/profile", label: "Profile", icon: "user" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Let's play chess!">
      <span className="brand-mark"><PieceSvg type="n" color="w" /></span>
      <span className="brand-word">Let's Chess</span>
    </Link>
  );
}

export function App() {
  const { pathname } = useLocation();
  const inGame = pathname.startsWith("/play/") || pathname.startsWith("/review/");
  return (
    <div className={`shell ${inGame ? "shell-game" : ""}`}>
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <Brand />
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="topnav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>
        <QuickToggles />
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewGame />} />
          <Route path="/play/:id" element={<Play />} />
          <Route path="/games" element={<Games />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="tab">
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
