import "dotenv/config";
import app from "./app.js";
import { testDatabaseConnection } from "./config/database.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await testDatabaseConnection();

    console.log("Conexión con MySQL verificada");

    app.listen(PORT, () => {
      console.log(
        `PredictIA Industrial API ejecutándose en http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("No fue posible conectar con MySQL:", error.message);
    process.exit(1);
  }
};

startServer();
