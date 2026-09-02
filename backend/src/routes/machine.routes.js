import { Router } from "express";
import { listMachines } from "../controllers/machine.controller.js";

const router = Router();

router.get("/", listMachines);

export default router;
