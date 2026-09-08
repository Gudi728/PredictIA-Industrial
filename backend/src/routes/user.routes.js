import { Router } from "express";
import {
  changeStatus,
  create,
  getById,
  list,
  update,
} from "../controllers/user.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.use(
  authenticate,
  authorizeRoles("administrador")
);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.put("/:id", update);
router.patch("/:id/estado", changeStatus);

export default router;