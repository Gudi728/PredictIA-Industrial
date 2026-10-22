import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth.js";
import LoadingScreen from "../components/LoadingScreen.jsx";

const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/403" replace />;
  }

  return children || <Outlet />;
};

export default RoleRoute;
