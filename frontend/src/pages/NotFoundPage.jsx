import { Link } from "react-router-dom";
import { useAuth } from "../auth/auth.js";

const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <main className="message-page">
      <span className="message-code">404</span>
      <span className="eyebrow">PÁGINA NO ENCONTRADA</span>
      <h1>No encontramos esa dirección</h1>
      <p>Revisá la dirección o regresá a un lugar disponible.</p>
      <Link className="button button-primary" to={isAuthenticated ? "/" : "/login"}>
        {isAuthenticated ? "Volver al inicio" : "Ir al inicio de sesión"}
      </Link>
    </main>
  );
};

export default NotFoundPage;
