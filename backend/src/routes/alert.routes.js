import { Router } from "express";
import {
  changeStatus,
  getById,
  list,
} from "../controllers/alert.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("administrador", "mantenimiento", "operario"),
  list
);

router.patch(
  "/:id/estado",
  authorizeRoles("administrador", "mantenimiento"),
  changeStatus
);

router.get(
  "/:id",
  authorizeRoles("administrador", "mantenimiento", "operario"),
  getById
);

export default router;
