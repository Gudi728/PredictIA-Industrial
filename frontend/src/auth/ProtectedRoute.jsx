import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.js";
import LoadingScreen from "../components/LoadingScreen.jsx";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
