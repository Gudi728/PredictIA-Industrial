import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen.jsx";
import { useAuth } from "../auth/auth.js";

const getLoginMessage = (error) => {
  if (error?.status === 401) return "El identificador o la contraseña no son correctos.";
  if (error?.status === 403) return "La cuenta no está habilitada para iniciar sesión.";
  if (error?.status === 0) return "No se pudo conectar con el servidor. Verificá la conexión e intentá nuevamente.";
  if (error?.status === 400) return "Completá el identificador y la contraseña.";
  return "No se pudo iniciar sesión. Intentá nuevamente.";
};

const getRequestedDestination = (location) => {
  const requestedPath = location.state?.from?.pathname;

  if (!requestedPath?.startsWith("/") || requestedPath.startsWith("//")) {
    return "/";
  }

  return `${requestedPath}${location.state.from.search || ""}${location.state.from.hash || ""}`;
};

const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={getRequestedDestination(location)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!identificador.trim() || !contrasena.trim()) {
      setErrorMessage("Ingresá tu identificador y contraseña.");
      return;
    }

    setSubmitting(true);

    try {
      await login({ identificador, contrasena });
      navigate(getRequestedDestination(location), { replace: true });
    } catch (error) {
      setErrorMessage(getLoginMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand-row">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span className="brand-name">PredictIA <strong>Industrial</strong></span>
        </div>

        <div className="login-heading">
          <span className="eyebrow">MANTENIMIENTO INTELIGENTE</span>
          <h1 id="login-title">Bienvenido</h1>
          <p>Ingresá para continuar al sistema de mantenimiento predictivo.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="identificador">Usuario o correo electrónico</label>
            <input
              autoComplete="username"
              id="identificador"
              name="identificador"
              onChange={(event) => setIdentificador(event.target.value)}
              placeholder="Ingresá tu usuario o correo"
              required
              value={identificador}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              autoComplete="current-password"
              id="contrasena"
              name="contrasena"
              onChange={(event) => setContrasena(event.target.value)}
              placeholder="Ingresá tu contraseña"
              required
              type="password"
              value={contrasena}
            />
          </div>

          {errorMessage && (
            <div className="form-error" role="alert">
              <span aria-hidden="true">!</span>
              {errorMessage}
            </div>
          )}

          <button className="button button-primary login-submit" disabled={submitting} type="submit">
            {submitting ? (
              <><span className="button-spinner" aria-hidden="true" />Ingresando…</>
            ) : (
              "Ingresar al sistema"
            )}
          </button>
        </form>

        <p className="login-note">Acceso exclusivo para personal autorizado.</p>
      </section>
      <aside className="login-aside" aria-label="Información del sistema">
        <div className="aside-orb aside-orb-one" />
        <div className="aside-orb aside-orb-two" />
        <div className="aside-content">
          <div className="signal-icon" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <p className="eyebrow aside-eyebrow">INDUSTRIA 4.0</p>
          <h2>Anticiparse es mantener en movimiento.</h2>
          <p className="aside-description">
            Monitoreo inteligente para acompañar el rendimiento y la confiabilidad industrial.
          </p>
          <div className="aside-footer"><span className="status-dot" /> Plataforma de monitoreo predictivo</div>
        </div>
      </aside>
    </main>
  );
};

export default LoginPage;
