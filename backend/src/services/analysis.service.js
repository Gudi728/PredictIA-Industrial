import {
  findAlertById,
  insertAlert,
} from "../repositories/alert.repository.js";

export const analyzeMeasurement = async ({
  connection,
  measurement,
  limit,
}) => {
  const detectedValue = Number(measurement.valor);
  const appliedLimit = Number(limit.valor_maximo);
  const exceedsLimit = detectedValue > appliedLimit;

  if (!exceedsLimit) {
    return {
      limite_aplicado: appliedLimit,
      supera_limite: false,
      alerta_generada: false,
      alerta: null,
    };
  }

  const unit = measurement.unidad || "";
  const detail = `El valor detectado ${detectedValue.toFixed(2)} ${unit} supera el límite configurado de ${appliedLimit.toFixed(2)} ${unit}`
    .slice(0, 499);

  const alertId = await insertAlert(connection, {
    measurementId: measurement.id_medicion,
    machineId: measurement.id_maquina,
    variableId: measurement.id_variable,
    reason: "superacion_limite",
    detail,
    detectedValue,
    appliedLimit,
  });

  const alert = await findAlertById(connection, alertId);

  if (!alert) {
    const error = new Error("No fue posible recuperar la alerta registrada");
    error.status = 500;
    throw error;
  }

  return {
    limite_aplicado: Number(alert.limite_aplicado),
    supera_limite: true,
    alerta_generada: true,
    alerta: {
      ...alert,
      valor_detectado: Number(alert.valor_detectado),
      limite_aplicado: Number(alert.limite_aplicado),
    },
  };
};