import { Router } from "express";
import {
  createTest,
  getCurrentState,
  getHistory,
  simulate,
} from "../controllers/measurement.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/estado-actual",
  authorizeRoles("administrador", "mantenimiento", "operario"),
  getCurrentState
);

router.get(
  "/",
  authorizeRoles("administrador", "mantenimiento", "operario"),
  getHistory
);

router.post(
  "/simular",
  authorizeRoles("administrador"),
  simulate
);

router.post(
  "/prueba",
  authorizeRoles("administrador"),
  createTest
);

export default router;