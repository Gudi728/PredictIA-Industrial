import { Router } from "express";
import { listRoles } from "../controllers/role.controller.js";
import {
	authenticate,
	authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorizeRoles("administrador"),
	listRoles
);

export default router;
