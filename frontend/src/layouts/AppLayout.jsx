import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.js";

const roleLabels = {
  administrador: "Administrador",
  mantenimiento: "Mantenimiento",
  operario: "Operario",
};

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand brand-compact" to="/" aria-label="PredictIA Industrial, inicio">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PredictIA <strong>Industrial</strong></span>
        </Link>
        <nav className="app-navigation" aria-label="Navegación principal">
          <Link className="app-nav-link" to="/maquinas">Máquinas</Link>
          <Link className="app-nav-link" to="/mediciones">Mediciones</Link>
          <Link className="app-nav-link" to="/alertas">Alertas</Link>
          {(user.rol === "administrador" || user.rol === "mantenimiento") && (
            <Link className="app-nav-link" to="/limites">Límites</Link>
          )}
          {user.rol === "administrador" && (
            <Link className="app-nav-link" to="/usuarios">Usuarios</Link>
          )}
        </nav>
        <div className="session-tools">
          <div className="session-identity">
            <span className="session-name">{user.nombre} {user.apellido}</span>
            <span className="role-badge">{roleLabels[user.rol]}</span>
          </div>
          <button className="button button-quiet" type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">PredictIA Industrial · Mantenimiento predictivo IoT</footer>
    </div>
  );
};

export default AppLayout;
