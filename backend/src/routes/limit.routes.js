import { Router } from "express";
import {
  create,
  getById,
  list,
  update,
} from "../controllers/limit.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("administrador", "mantenimiento"),
  list
);
router.get(
  "/:id",
  authorizeRoles("administrador", "mantenimiento"),
  getById
);
router.post(
  "/",
  authorizeRoles("administrador"),
  create
);
router.put(
  "/:id",
  authorizeRoles("administrador"),
  update
);

export default router;