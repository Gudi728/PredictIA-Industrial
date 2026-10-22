import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { listAlerts } from "../api/alerts.js";
import { listMachines } from "../api/machines.js";
import { getCurrentState, getMeasurementHistory } from "../api/measurements.js";
import { useAuth } from "../auth/auth.js";
import MeasurementChart from "../components/MeasurementChart.jsx";

const safeError = (error) => {
  if (error instanceof NetworkError || error?.status === 0) return "No se pudo conectar con el servidor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar esta información.";
    if (error.status === 404) return "La máquina seleccionada no está disponible.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
  }
  return "No se pudo completar la operación.";
};

const formatDateTime = (value) => new Date(value).toLocaleString();

const getStatusClass = (value, limit) => {
  if (value === null || limit === null) return "is-neutral";
  return Number(value) > Number(limit) ? "is-exceeded" : "is-normal";
};

const estadoLabels = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  resuelta: "Resuelta",
};

const estadoBadgeClasses = {
  pendiente: "is-pending",
  en_revision: "is-review",
  resuelta: "is-resolved",
};

const HomePage = () => {
  const { token, user, invalidateSession } = useAuth();
  const canViewLimits = user.rol === "administrador" || user.rol === "mantenimiento";
  const name = user.nombre?.trim() || user.nombre_usuario;
  const [machines, setMachines] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const detailRequestRef = useRef(0);

  const loadMachineDetail = useCallback(async (machineId) => {
    const requestId = ++detailRequestRef.current;
    setDetailLoading(true);
    setErrorMessage("");

    try {
      const [state, historyResponse] = await Promise.all([
        getCurrentState(machineId, { token, onUnauthorized: invalidateSession }),
        getMeasurementHistory(machineId, { token, onUnauthorized: invalidateSession, limite: 30 }),
      ]);
      if (requestId !== detailRequestRef.current) return;
      setCurrentState(state);
      setHistory(historyResponse.data);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (requestId !== detailRequestRef.current) return;
      setCurrentState(null);
      setHistory([]);
      setErrorMessage(safeError(error));
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }, [invalidateSession, token]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listMachines({ token, signal: controller.signal, onUnauthorized: invalidateSession }),
      listAlerts({ estado: "pendiente", limite: 1 }, { token, signal: controller.signal, onUnauthorized: invalidateSession }),
      listAlerts({ estado: "en_revision", limite: 1 }, { token, signal: controller.signal, onUnauthorized: invalidateSession }),
      listAlerts({ limite: 5 }, { token, signal: controller.signal, onUnauthorized: invalidateSession }),
    ])
      .then(async ([machinesResult, pendingResult, reviewResult, recentResult]) => {
        setMachines(machinesResult);
        setPendingCount(pendingResult.pagination.total);
        setReviewCount(reviewResult.pagination.total);
        setRecentAlerts(recentResult.data);
        if (machinesResult.length > 0) {
          setSelectedMachineId(String(machinesResult[0].id_maquina));
          await loadMachineDetail(String(machinesResult[0].id_maquina));
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setErrorMessage(safeError(error));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [invalidateSession, loadMachineDetail, token]);

  const handleMachineChange = (event) => {
    const machineId = event.target.value;
    setSelectedMachineId(machineId);
    loadMachineDetail(machineId);
  };

  const buildVariablePoints = (variableId) =>
    history
      .filter((measurement) => measurement.id_variable === variableId)
      .map((measurement) => ({
        id: measurement.id_medicion,
        valor: measurement.valor,
        fecha_hora: measurement.fecha_hora,
      }))
      .reverse();

  return (
    <section className="users-page dashboard-page" aria-labelledby="dashboard-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">PANEL PRINCIPAL</span>
          <h1 id="dashboard-title">Hola, {name}</h1>
          <p>Resumen del monitoreo de máquinas industriales.</p>
        </div>
      </div>

      {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}

      <div className="dashboard-metrics">
        <article className="metric-card">
          <span className="metric-label">Máquinas accesibles</span>
          <strong>{loading ? "…" : machines.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Alertas pendientes</span>
          <strong className="metric-warning">{loading ? "…" : pendingCount}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Alertas en revisión</span>
          <strong className="metric-info">{loading ? "…" : reviewCount}</strong>
        </article>
      </div>

      <section className="dashboard-panel" aria-labelledby="dashboard-machine-title">
        <div className="users-card-heading">
          <h2 id="dashboard-machine-title">Estado por máquina</h2>
          <label className="dashboard-machine-picker">
            <span>Máquina</span>
            <select
              value={selectedMachineId}
              onChange={handleMachineChange}
              disabled={loading || machines.length === 0}
            >
              {machines.length === 0 ? (
                <option value="">Sin máquinas</option>
              ) : (
                machines.map((machine) => (
                  <option key={machine.id_maquina} value={String(machine.id_maquina)}>
                    {machine.nombre} ({machine.codigo})
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="users-inline-loading" role="status">Cargando panel…</div>
        ) : machines.length === 0 ? (
          <div className="users-empty">No hay máquinas disponibles para tu usuario.</div>
        ) : detailLoading ? (
          <div className="users-inline-loading" role="status">Consultando estado actual…</div>
        ) : currentState ? (
          <>
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
                      {latest
                        ? Number(latest.valor) > Number(variable.limite_maximo)
                          ? "Fuera de límite"
                          : "Dentro de límite"
                        : "Sin datos"}
                    </span>
                  </article>
                );
              })}
            </div>

            <div className="dashboard-charts">
              {currentState.variables.map((variable) => (
                <MeasurementChart
                  key={variable.id_variable}
                  title={variable.nombre_variable}
                  unit={variable.unidad}
                  limit={variable.limite_maximo}
                  points={buildVariablePoints(variable.id_variable)}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="dashboard-bottom">
        <section className="users-list-card dashboard-recent" aria-labelledby="recent-alerts-title">
          <div className="users-card-heading">
            <h2 id="recent-alerts-title">Alertas recientes</h2>
            <Link className="button button-quiet" to="/alertas">Ver todas</Link>
          </div>
          {loading ? (
            <div className="users-inline-loading" role="status">Consultando alertas…</div>
          ) : recentAlerts.length === 0 ? (
            <div className="users-empty">No hay alertas registradas.</div>
          ) : (
            <ul className="recent-alert-list">
              {recentAlerts.map((alert) => (
                <li key={alert.id_alerta}>
                  <div className="recent-alert-info">
                    <strong>{alert.nombre_maquina} · {alert.nombre_variable}</strong>
                    <span>
                      {alert.valor_detectado} {alert.unidad} (límite {alert.limite_aplicado}) · {formatDateTime(alert.fecha_alerta)}
                    </span>
                  </div>
                  <span className={`alert-status-badge ${estadoBadgeClasses[alert.estado_actual] ?? ""}`}>
                    {estadoLabels[alert.estado_actual] ?? alert.estado_actual}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="users-editor-card dashboard-quick" aria-labelledby="quick-access-title">
          <div className="users-card-heading">
            <h2 id="quick-access-title">Accesos rápidos</h2>
          </div>
          <div className="quick-link-grid">
            <Link className="quick-link-card" to="/maquinas">
              Máquinas
              <span>Gestión y estado</span>
            </Link>
            <Link className="quick-link-card" to="/mediciones">
              Mediciones
              <span>Estado actual e historial</span>
            </Link>
            <Link className="quick-link-card" to="/alertas">
              Alertas
              <span>Seguimiento y atención</span>
            </Link>
            {canViewLimits && (
              <Link className="quick-link-card" to="/limites">
                Límites
                <span>Umbrales por variable</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

export default HomePage;
