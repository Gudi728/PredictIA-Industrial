import { useCallback, useEffect, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { listMachines } from "../api/machines.js";
import { changeAlertStatus, getAlertDetail, listAlerts } from "../api/alerts.js";
import { useAuth } from "../auth/auth.js";

const safeError = (error) => {
  if (error instanceof NetworkError || error?.status === 0) return "No se pudo conectar con el servidor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar o modificar alertas.";
    if (error.status === 404) return "La alerta o la máquina indicada no está disponible.";
    if (error.status === 409) return "La transición de estado solicitada no está permitida.";
    if (error.status === 400) return "Revisá los filtros o los datos ingresados.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
  }
  return "No se pudo completar la operación.";
};

const formatDateTime = (value) => new Date(value).toLocaleString();

const motivoLabels = {
  superacion_limite: "Superación de límite",
  tendencia_anormal: "Tendencia anormal",
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

const nextStatusByCurrent = {
  pendiente: { estado: "en_revision", label: "Marcar en revisión" },
  en_revision: { estado: "resuelta", label: "Marcar resuelta" },
};

const AlertsPage = () => {
  const { token, user, invalidateSession } = useAuth();
  const canChangeStatus = user.rol === "administrador" || user.rol === "mantenimiento";
  const [machines, setMachines] = useState([]);
  const [machineFilter, setMachineFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [alertDetail, setAlertDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAlerts = useCallback(async (filters) => {
    setListLoading(true);
    setErrorMessage("");

    try {
      const response = await listAlerts(filters, { token, onUnauthorized: invalidateSession });
      setAlerts(response.data);
      setAlertsTotal(response.pagination.total);
    } catch (error) {
      setAlerts([]);
      setAlertsTotal(0);
      setErrorMessage(safeError(error));
    } finally {
      setListLoading(false);
    }
  }, [invalidateSession, token]);

  const loadAlertDetail = useCallback(async (alertId) => {
    setDetailLoading(true);

    try {
      const detail = await getAlertDetail(alertId, { token, onUnauthorized: invalidateSession });
      setAlertDetail(detail);
    } catch (error) {
      setAlertDetail(null);
      setErrorMessage(safeError(error));
    } finally {
      setDetailLoading(false);
    }
  }, [invalidateSession, token]);

  useEffect(() => {
    const controller = new AbortController();
    listMachines({ token, signal: controller.signal, onUnauthorized: invalidateSession })
      .then(async (result) => {
        setMachines(result);
        await loadAlerts({});
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setErrorMessage(safeError(error));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [invalidateSession, loadAlerts, token]);

  const handleMachineFilterChange = (event) => {
    const value = event.target.value;
    setMachineFilter(value);
    setSuccessMessage("");
    loadAlerts({ id_maquina: value || undefined, estado: statusFilter || undefined });
  };

  const handleStatusFilterChange = (event) => {
    const value = event.target.value;
    setStatusFilter(value);
    setSuccessMessage("");
    loadAlerts({ id_maquina: machineFilter || undefined, estado: value || undefined });
  };

  const handleSelectAlert = (alertId) => {
    setSelectedAlertId(alertId);
    setErrorMessage("");
    setSuccessMessage("");
    loadAlertDetail(alertId);
  };

  const handleChangeStatus = async () => {
    if (!alertDetail) return;
    const transition = nextStatusByCurrent[alertDetail.estado_actual];
    if (!transition) return;

    setChangingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await changeAlertStatus(alertDetail.id_alerta, transition.estado, {
        token,
        onUnauthorized: invalidateSession,
      });
      setSuccessMessage(`La alerta #${alertDetail.id_alerta} pasó a estado "${estadoLabels[transition.estado]}".`);
      await Promise.all([
        loadAlerts({ id_maquina: machineFilter || undefined, estado: statusFilter || undefined }),
        loadAlertDetail(alertDetail.id_alerta),
      ]);
    } catch (error) {
      setErrorMessage(safeError(error));
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <section className="users-page alerts-page" aria-labelledby="alerts-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">MONITOREO</span>
          <h1 id="alerts-title">Alertas</h1>
          <p>Alertas generadas automáticamente por el análisis del backend.</p>
        </div>
        <span className="users-count">{loading ? "Cargando…" : `${alertsTotal} alertas`}</span>
      </div>

      <div className="alerts-filters">
        <label className="alerts-filter-field">
          <span>Máquina</span>
          <select value={machineFilter} onChange={handleMachineFilterChange} disabled={loading}>
            <option value="">Todas las máquinas</option>
            {machines.map((machine) => (
              <option key={machine.id_maquina} value={String(machine.id_maquina)}>
                {machine.nombre} ({machine.codigo})
              </option>
            ))}
          </select>
        </label>
        <label className="alerts-filter-field">
          <span>Estado</span>
          <select value={statusFilter} onChange={handleStatusFilterChange} disabled={loading}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelta">Resuelta</option>
          </select>
        </label>
      </div>

      <div className="users-workspace">
        <section className="users-list-card alerts-list-card" aria-labelledby="alerts-list-title">
          <div className="users-card-heading">
            <h2 id="alerts-list-title">Listado</h2>
            <span>{alerts.length}</span>
          </div>
          {loading || listLoading ? (
            <div className="users-inline-loading" role="status">Consultando alertas…</div>
          ) : alerts.length === 0 ? (
            <div className="users-empty">No hay alertas registradas con los filtros actuales.</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table alerts-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Máquina</th>
                    <th scope="col">Variable</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Límite</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id_alerta}
                      className={alert.id_alerta === selectedAlertId ? "is-selected" : ""}
                    >
                      <td>{formatDateTime(alert.fecha_alerta)}</td>
                      <td>{alert.nombre_maquina}</td>
                      <td>{alert.nombre_variable}</td>
                      <td>{alert.valor_detectado} {alert.unidad}</td>
                      <td>{alert.limite_aplicado} {alert.unidad}</td>
                      <td>{motivoLabels[alert.motivo] ?? alert.motivo}</td>
                      <td>
                        <span className={`alert-status-badge ${estadoBadgeClasses[alert.estado_actual] ?? ""}`}>
                          {estadoLabels[alert.estado_actual] ?? alert.estado_actual}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => handleSelectAlert(alert.id_alerta)}
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="users-editor-card alert-detail" aria-labelledby="alert-detail-title">
          {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}
          {successMessage && <div className="users-alert users-alert-success" role="status">{successMessage}</div>}

          {!selectedAlertId ? (
            <div className="users-editor-empty">
              <span className="users-empty-icon" aria-hidden="true">◎</span>
              <h2 id="alert-detail-title">Seleccioná una alerta</h2>
              <p>Elegí una alerta del listado para ver su detalle completo.</p>
            </div>
          ) : detailLoading ? (
            <div className="users-inline-loading" role="status">Consultando detalle…</div>
          ) : alertDetail ? (
            <>
              <div className="measurement-title-row">
                <div>
                  <span className="eyebrow">DETALLE</span>
                  <h2 id="alert-detail-title">Alerta #{alertDetail.id_alerta}</h2>
                  <p>{formatDateTime(alertDetail.fecha_alerta)}</p>
                </div>
                <span className={`alert-status-badge ${estadoBadgeClasses[alertDetail.estado_actual] ?? ""}`}>
                  {estadoLabels[alertDetail.estado_actual] ?? alertDetail.estado_actual}
                </span>
              </div>

              <dl className="alert-detail-grid">
                <div>
                  <dt>Máquina</dt>
                  <dd>{alertDetail.nombre_maquina} ({alertDetail.codigo_maquina}) · {alertDetail.maquina_activa ? "Activa" : "Inactiva"}</dd>
                </div>
                <div>
                  <dt>Variable</dt>
                  <dd>{alertDetail.nombre_variable} ({alertDetail.unidad}) · {alertDetail.variable_activa ? "Activa" : "Inactiva"}</dd>
                </div>
                <div>
                  <dt>Tipo de alerta</dt>
                  <dd>{motivoLabels[alertDetail.motivo] ?? alertDetail.motivo}</dd>
                </div>
                <div>
                  <dt>Valor detectado</dt>
                  <dd>{alertDetail.valor_detectado} {alertDetail.unidad} (límite: {alertDetail.limite_aplicado} {alertDetail.unidad})</dd>
                </div>
                <div>
                  <dt>Detalle</dt>
                  <dd>{alertDetail.detalle || "Sin detalle adicional."}</dd>
                </div>
                <div>
                  <dt>Medición asociada</dt>
                  <dd>
                    #{alertDetail.id_medicion} · {alertDetail.medicion.valor} {alertDetail.unidad} ·
                    origen {alertDetail.medicion.origen} · {formatDateTime(alertDetail.medicion.fecha_hora)}
                  </dd>
                </div>
              </dl>

              {canChangeStatus && nextStatusByCurrent[alertDetail.estado_actual] && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={handleChangeStatus}
                  disabled={changingStatus}
                >
                  {changingStatus ? "Actualizando…" : nextStatusByCurrent[alertDetail.estado_actual].label}
                </button>
              )}
              {alertDetail.estado_actual === "resuelta" && (
                <p className="alert-detail-note">La alerta está resuelta. No admite más cambios de estado.</p>
              )}
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default AlertsPage;
