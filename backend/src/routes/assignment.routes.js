import { Router } from "express";
import {
  create,
  list,
  updateState,
} from "../controllers/assignment.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorizeRoles("administrador"));

router.get("/", list);
router.post("/", create);
router.patch("/:idUsuario/:idMaquina/estado", updateState);

export default router;