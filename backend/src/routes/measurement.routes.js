import { Router } from "express";
import {
  createTest,
  simulate,
} from "../controllers/measurement.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

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