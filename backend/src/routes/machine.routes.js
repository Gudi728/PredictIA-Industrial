import { Router } from "express";
import {
	changeStatus,
	create,
	getById,
	list,
	update,
} from "../controllers/machine.controller.js";
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
router.get(
	"/:id",
	authorizeRoles("administrador", "mantenimiento", "operario"),
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
router.patch(
	"/:id/estado",
	authorizeRoles("administrador"),
	changeStatus
);

export default router;
