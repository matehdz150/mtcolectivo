import "./Sidebar.scss";
import { useAuth } from "../contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  BarChart3,
  HandCoins
} from "lucide-react";

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* ===== MOBILE TOP BAR ===== */}
      <div className="mobile-navbar">
        <div className="mobile-navbar__left">
          <button
            className="menu-toggle"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="mobile-title">MT Colectivo</span>
        </div>
      </div>

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${open ? "open" : ""}`}>

        {/* Mobile close */}
        <button className="close-btn" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>

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
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <LayoutDashboard size={16} />
            Ordenes
          </NavLink>

          <NavLink
            to="/prices"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <HandCoins size={16} />
            Precios
          </NavLink>

          {/* 🆕 ESTADÍSTICAS */}
          <NavLink
            to="/stats"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <BarChart3 size={16} />
            Estadísticas
          </NavLink>

        </nav>

        <div className="sidebar__footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
          <div className="version">v1.0.0</div>
        </div>
      </aside>

      {/* Overlay móvil */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}