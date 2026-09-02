export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: "API de PredictIA Industrial funcionando correctamente",
    data: {
      service: "predictia-industrial-api",
      status: "OK",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
};
