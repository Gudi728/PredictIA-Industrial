import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import RoleRoute from "./auth/RoleRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import ForbiddenPage from "./pages/ForbiddenPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import MachinesPage from "./pages/MachinesPage.jsx";
import LimitsPage from "./pages/LimitsPage.jsx";
import MeasurementsPage from "./pages/MeasurementsPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/403" element={<ForbiddenPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="maquinas" element={<MachinesPage />} />
        <Route path="mediciones" element={<MeasurementsPage />} />
        <Route path="alertas" element={<AlertsPage />} />
        <Route element={<RoleRoute allowedRoles={["administrador", "mantenimiento"]} />}>
          <Route path="limites" element={<LimitsPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={["administrador"]} />}>
          <Route path="usuarios" element={<UsersPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
