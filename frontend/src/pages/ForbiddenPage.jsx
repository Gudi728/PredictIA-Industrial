import { Link } from "react-router-dom";
import { useAuth } from "../auth/auth.js";

const ForbiddenPage = () => {
  const { isAuthenticated } = useAuth();
  const destination = isAuthenticated ? "/" : "/login";
  const label = isAuthenticated ? "Volver al inicio" : "Ir al inicio de sesión";

  return (
    <main className="message-page">
      <span className="message-code">403</span>
      <span className="eyebrow">ACCESO RESTRINGIDO</span>
      <h1>No tenés permiso para ver esta página</h1>
      <p>Tu sesión sigue activa, pero esta sección requiere otro nivel de acceso.</p>
      <Link className="button button-primary" to={destination}>{label}</Link>
    </main>
  );
};

export default ForbiddenPage;
