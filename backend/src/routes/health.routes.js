import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { getDatabaseHealth } from "../controllers/database.controller.js";

const router = Router();

router.get("/", getHealth);
router.get("/database", getDatabaseHealth);

export default router;
