import "./Sidebar.scss";
import { useAuth } from "../contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="logo">MT</div>
        <div className="brand-text">
          <h3>MT Colectivo</h3>
          <span>Panel administrativo</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          📊 Dashboard
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <button className="logout-btn" onClick={handleLogout}>
          ⎋ Cerrar sesión
        </button>
        <div className="version">v1.0.0</div>
      </div>
    </aside>
  );
}