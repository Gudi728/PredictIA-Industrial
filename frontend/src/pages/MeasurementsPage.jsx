import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { listMachines } from "../api/machines.js";
import { createTestMeasurement, getCurrentState, getMeasurementHistory, simulateMeasurement } from "../api/measurements.js";
import { useAuth } from "../auth/auth.js";

const safeError = (error) => {
  if (error instanceof NetworkError || error?.status === 0) return "No se pudo conectar con el servidor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar o simular mediciones.";
    if (error.status === 404) return "La máquina seleccionada no está disponible.";
    if (error.status === 409) return "No existe un límite configurado para esa máquina y variable.";
    if (error.status === 400) return "Revisá los datos ingresados o el estado de la máquina.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
  }
  return "No se pudo completar la operación.";
};

const formatDateTime = (value) => new Date(value).toLocaleString();

const getStatusClass = (value, limit) => {
  if (value === null || limit === null) return "is-neutral";
  return Number(value) > Number(limit) ? "is-exceeded" : "is-normal";
};

const MeasurementsPage = () => {
  const { token, user, invalidateSession } = useAuth();
  const isAdministrator = user.rol === "administrador";
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [testVariableId, setTestVariableId] = useState("");
  const [testValue, setTestValue] = useState("");
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const stateRequestRef = useRef(0);

  const refreshMachineData = useCallback(async (machineId) => {
    const controller = new AbortController();
    const requestId = ++stateRequestRef.current;
    setDetailLoading(true);
    setErrorMessage("");

    try {
      const [state, historyResponse] = await Promise.all([
        getCurrentState(machineId, { token, signal: controller.signal, onUnauthorized: invalidateSession }),
        getMeasurementHistory(machineId, { token, signal: controller.signal, onUnauthorized: invalidateSession }),
      ]);
      if (requestId !== stateRequestRef.current) return;
      setCurrentState(state);
      setHistory(historyResponse.data);
      setHistoryCount(historyResponse.count);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (requestId !== stateRequestRef.current) return;
      setCurrentState(null);
      setHistory([]);
      setHistoryCount(0);
      setErrorMessage(safeError(error));
    } finally {
      if (requestId === stateRequestRef.current) setDetailLoading(false);
    }
  }, [invalidateSession, token]);

  useEffect(() => {
    const controller = new AbortController();
    listMachines({ token, signal: controller.signal, onUnauthorized: invalidateSession })
      .then(async (result) => {
        setMachines(result);
        if (result.length > 0) {
          setSelectedMachineId(String(result[0].id_maquina));
          await refreshMachineData(String(result[0].id_maquina));
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setErrorMessage(safeError(error));
        setLoading(false);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [invalidateSession, refreshMachineData, token]);

  const handleMachineSelection = (machineId) => {
    setSelectedMachineId(String(machineId));
    setTestVariableId("");
    setTestValue("");
    setSuccessMessage("");
    refreshMachineData(String(machineId));
  };

  const handleSimulate = async (variable) => {
    if (!selectedMachineId) return;
    setSimulating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await simulateMeasurement(
        { id_maquina: Number(selectedMachineId), id_variable: variable.id_variable },
        { token, onUnauthorized: invalidateSession }
      );
      setSuccessMessage(`Se registró una medición simulada de ${variable.nombre_variable}.`);
      await refreshMachineData(selectedMachineId);
    } catch (error) {
      setErrorMessage(safeError(error));
    } finally {
      setSimulating(false);
    }
  };

  const handleTestSubmit = async (event) => {
    event.preventDefault();
    if (!selectedMachineId || !testVariableId) return;

    const trimmedValue = testValue.trim();
    if (!/^(?:\d+|\d*\.\d{1,2})$/.test(trimmedValue)) {
      setErrorMessage("Ingresá un valor numérico válido con hasta dos decimales.");
      setSuccessMessage("");
      return;
    }

    const numericValue = Number(trimmedValue);
    if (numericValue > 99999999.99) {
      setErrorMessage("El valor debe estar entre 0.00 y 99999999.99.");
      setSuccessMessage("");
      return;
    }

    const testVariable = currentState?.variables.find(
      (variable) => String(variable.id_variable) === testVariableId
    );

    setTestSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createTestMeasurement(
        { id_maquina: Number(selectedMachineId), id_variable: Number(testVariableId), valor: numericValue },
        { token, onUnauthorized: invalidateSession }
      );
      setSuccessMessage(
        `Medición de prueba registrada: ${numericValue} ${testVariable?.unidad ?? ""} en ${testVariable?.nombre_variable ?? "la variable seleccionada"}.`
      );
      setTestValue("");
      await refreshMachineData(selectedMachineId);
    } catch (error) {
      setErrorMessage(safeError(error));
    } finally {
      setTestSubmitting(false);
    }
  };

  return (
    <section className="users-page measurements-page" aria-labelledby="measurements-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">MONITOREO</span>
          <h1 id="measurements-title">Mediciones</h1>
          <p>Consultá estado actual e historial de las variables monitoreadas.</p>
        </div>
        <span className="users-count">{loading ? "Cargando…" : `${historyCount} mediciones recientes`}</span>
      </div>

      <div className="users-workspace">
        <section className="users-list-card measurements-select-card" aria-labelledby="machine-selection-title">
          <div className="users-card-heading">
            <h2 id="machine-selection-title">Máquina</h2>
          </div>
          {loading ? (
            <div className="users-inline-loading" role="status">Cargando máquinas…</div>
          ) : machines.length === 0 ? (
            <div className="users-empty">No hay máquinas disponibles.</div>
          ) : (
            <div className="measurement-machine-list">
              {machines.map((machine) => {
                const isSelected = String(machine.id_maquina) === selectedMachineId;
                return (
                  <button
                    key={machine.id_maquina}
                    className={`user-select-button machine-select-button ${isSelected ? "is-selected" : ""}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleMachineSelection(machine.id_maquina)}
                  >
                    <span className="user-full-name">{machine.nombre}</span>
                    <span className="user-handle">{machine.codigo}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="users-editor-card measurement-content" aria-labelledby="measurement-content-title">
          {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}
          {successMessage && <div className="users-alert users-alert-success" role="status">{successMessage}</div>}

          {!selectedMachineId ? (
            <div className="users-editor-empty">
              <span className="users-empty-icon" aria-hidden="true">◎</span>
              <h2 id="measurement-content-title">Seleccioná una máquina</h2>
              <p>Elegí una máquina para ver su estado actual y su historial de mediciones.</p>
            </div>
          ) : detailLoading ? (
            <div className="users-inline-loading" role="status">Consultando mediciones…</div>
          ) : currentState ? (
            <>
              <div className="measurement-title-row">
                <div>
                  <span className="eyebrow">ESTADO ACTUAL</span>
                  <h2 id="measurement-content-title">{currentState.nombre_maquina}</h2>
                  <p>{currentState.codigo_maquina} · {currentState.activo ? "Activa" : "Inactiva"}</p>
                </div>
              </div>

              <div className="measurement-cards">
                {currentState.variables.map((variable) => {
                  const latest = variable.ultima_medicion;
                  const statusClass = getStatusClass(latest?.valor ?? null, variable.limite_maximo);
                  return (
                    <article key={variable.id_variable} className="measurement-card">
                      <div>
                        <span className="measurement-label">{variable.nombre_variable}</span>
                        <strong>{latest ? `${latest.valor} ${variable.unidad}` : "Sin medición"}</strong>
                        <span className="measurement-limit">Límite: {variable.limite_maximo} {variable.unidad}</span>
                      </div>
                      <span className={`measurement-status ${statusClass}`}>
                        {latest ? (Number(latest.valor) > Number(variable.limite_maximo) ? "Fuera de límite" : "Dentro de límite") : "Sin datos"}
                      </span>
                      {isAdministrator && (
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => handleSimulate(variable)}
                          disabled={simulating}
                        >
                          Simular
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {isAdministrator && (
                <section className="measurement-test-form" aria-labelledby="test-measurement-title">
                  <div className="users-card-heading">
                    <h2 id="test-measurement-title">Medición de prueba</h2>
                    <span className="measurement-test-badge">MEDICIÓN DE PRUEBA</span>
                  </div>
                  <p className="measurement-test-note">
                    Registra un valor manual con origen "prueba". No es una lectura física del equipo.
                    El backend analiza el valor y genera una alerta automática si supera el límite configurado.
                  </p>
                  <form className="measurement-test-controls" onSubmit={handleTestSubmit}>
                    <label>
                      <span>Variable</span>
                      <select
                        value={testVariableId}
                        onChange={(event) => setTestVariableId(event.target.value)}
                        required
                      >
                        <option value="" disabled>Seleccioná una variable</option>
                        {currentState.variables.map((variable) => (
                          <option key={variable.id_variable} value={String(variable.id_variable)}>
                            {variable.nombre_variable} (límite: {variable.limite_maximo} {variable.unidad})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Valor{testVariableId ? ` (${currentState.variables.find((variable) => String(variable.id_variable) === testVariableId)?.unidad ?? ""})` : ""}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={testValue}
                        onChange={(event) => setTestValue(event.target.value)}
                        placeholder="Ej.: 90"
                        required
                      />
                    </label>
                    <button className="button button-primary" type="submit" disabled={testSubmitting || !testVariableId}>
                      {testSubmitting ? "Registrando…" : "Registrar medición de prueba"}
                    </button>
                  </form>
                </section>
              )}

              <section className="measurement-history" aria-labelledby="history-title">
                <div className="users-card-heading">
                  <h2 id="history-title">Historial</h2>
                  <span>{historyCount}</span>
                </div>
                {history.length === 0 ? (
                  <div className="users-empty">No hay mediciones registradas para esta máquina.</div>
                ) : (
                  <div className="users-table-wrap">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th scope="col">Variable</th>
                          <th scope="col">Valor</th>
                          <th scope="col">Origen</th>
                          <th scope="col">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((measurement) => (
                          <tr key={measurement.id_medicion}>
                            <td>{measurement.nombre_variable}</td>
                            <td>{measurement.valor} {measurement.unidad}</td>
                            <td>{measurement.origen}</td>
                            <td>{formatDateTime(measurement.fecha_hora)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default MeasurementsPage;
