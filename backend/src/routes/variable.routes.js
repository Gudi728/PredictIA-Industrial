import { Router } from "express";
import {
  listVariables,
} from "../controllers/variable.controller.js";

const router = Router();

router.get("/", listVariables);

export default router;
