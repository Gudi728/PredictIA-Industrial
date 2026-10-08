import { Router } from "express";
import {
  changeStatus,
  createAttention,
  getAttentions,
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

router.post(
  "/:id/atenciones",
  authorizeRoles("administrador", "mantenimiento"),
  createAttention
);

router.get(
  "/:id/atenciones",
  authorizeRoles("administrador", "mantenimiento", "operario"),
  getAttentions
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
