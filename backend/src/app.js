import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import roleRoutes from "./routes/role.routes.js";
import userRoutes from "./routes/user.routes.js";
import variableRoutes from "./routes/variable.routes.js";
import machineRoutes from "./routes/machine.routes.js";
import limitRoutes from "./routes/limit.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bienvenido a la API de PredictIA Industrial",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/variables", variableRoutes);
app.use("/api/maquinas", machineRoutes);
app.use("/api/limites", limitRoutes);
app.use("/api/mediciones", measurementRoutes);
app.use("/api/alertas", alertRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
