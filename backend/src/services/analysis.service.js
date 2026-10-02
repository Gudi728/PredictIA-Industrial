import {
  findAlertById,
  insertAlert,
} from "../repositories/alert.repository.js";
import {
  findLastThreeMeasurements,
} from "../repositories/measurement.repository.js";

const toCents = (value) => Math.round(Number(value) * 100);

const buildAlertResponse = (alert) => ({
  ...alert,
  valor_detectado: Number(alert.valor_detectado),
  limite_aplicado: Number(alert.limite_aplicado),
});

const createAlert = async ({
  connection,
  measurement,
  reason,
  detail,
  detectedValue,
  appliedLimit,
}) => {
  const alertId = await insertAlert(connection, {
    measurementId: measurement.id_medicion,
    machineId: measurement.id_maquina,
    variableId: measurement.id_variable,
    reason,
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

  return buildAlertResponse(alert);
};

export const analyzeMeasurement = async ({
  connection,
  measurement,
  limit,
}) => {
  const detectedValue = Number(measurement.valor);
  const appliedLimit = Number(limit.valor_maximo);

  const detectedCents = toCents(detectedValue);
  const limitCents = toCents(appliedLimit);
  const trendThresholdCents = Math.ceil((limitCents * 80) / 100);
  const trendThreshold = trendThresholdCents / 100;

  const exceedsLimit = detectedCents > limitCents;
  const unit = measurement.unidad || "";

  if (exceedsLimit) {
    const detail =
      `El valor detectado ${detectedValue.toFixed(2)} ${unit} supera el límite configurado de ${appliedLimit.toFixed(2)} ${unit}`
        .slice(0, 499);

    const alert = await createAlert({
      connection,
      measurement,
      reason: "superacion_limite",
      detail,
      detectedValue,
      appliedLimit,
    });

    return {
      limite_aplicado: Number(alert.limite_aplicado),
      umbral_tendencia: trendThreshold,
      supera_limite: true,
      tendencia_anormal: false,
      alerta_generada: true,
      alerta: alert,
    };
  }

  const lastMeasurements = await findLastThreeMeasurements(
    connection,
    measurement.id_maquina,
    measurement.id_variable
  );

  let abnormalTrend = false;
  let trendValues = [];

  if (lastMeasurements.length === 3) {
    trendValues = lastMeasurements.map((item) => Number(item.valor));
    const trendCents = trendValues.map(toCents);

    const strictlyIncreasing =
      trendCents[0] < trendCents[1] &&
      trendCents[1] < trendCents[2];

    const reachesThreshold =
      trendCents[2] >= trendThresholdCents;

    abnormalTrend = strictlyIncreasing && reachesThreshold;
  }

  if (!abnormalTrend) {
    return {
      limite_aplicado: appliedLimit,
      umbral_tendencia: trendThreshold,
      supera_limite: false,
      tendencia_anormal: false,
      alerta_generada: false,
      alerta: null,
    };
  }

  const detail =
    `Tendencia creciente detectada: ${trendValues[0].toFixed(2)}, ${trendValues[1].toFixed(2)} y ${trendValues[2].toFixed(2)} ${unit}; el último valor alcanza o supera el umbral del 80 % (${trendThreshold.toFixed(2)} ${unit}) del límite ${appliedLimit.toFixed(2)} ${unit}`
      .slice(0, 499);

  const alert = await createAlert({
    connection,
    measurement,
    reason: "tendencia_anormal",
    detail,
    detectedValue,
    appliedLimit,
  });

  return {
    limite_aplicado: Number(alert.limite_aplicado),
    umbral_tendencia: trendThreshold,
    supera_limite: false,
    tendencia_anormal: true,
    alerta_generada: true,
    alerta: alert,
  };
};
