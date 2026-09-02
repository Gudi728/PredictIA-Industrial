import { Router } from "express";
import { listRoles } from "../controllers/role.controller.js";

const router = Router();

router.get("/", listRoles);

export default router;
