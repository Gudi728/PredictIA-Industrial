import { useEffect, useRef, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { listMachines } from "../api/machines.js";
import { listLimits, listVariables, updateLimit } from "../api/limits.js";
import { createLimit } from "../api/limits.js";
import { useAuth } from "../auth/auth.js";
import LimitForm from "../components/LimitForm.jsx";

const safeError = (error, context) => {
  if (error instanceof NetworkError || error?.status === 0) return "No se pudo conectar con el servidor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar límites.";
    if (error.status === 404) return "El límite o entidad seleccionada no está disponible.";
    if (error.status === 409) return "Ya existe una configuración para esa máquina y variable.";
    if (error.status === 400) return "Revisá los valores ingresados.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
  }
  return context === "list" ? "No se pudieron cargar los límites." : "No se pudo guardar la configuración.";
};

const LimitsPage = () => {
  const { token, user, invalidateSession } = useAuth();
  const canManage = user.rol === "administrador";
  const [machines, setMachines] = useState([]);
  const [variables, setVariables] = useState([]);
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [selectedLimit, setSelectedLimit] = useState(null);
  const [saving, setSaving] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestRef.current;

    Promise.all([
      listMachines({ token, signal: controller.signal, onUnauthorized: invalidateSession }),
      listVariables({ token, signal: controller.signal, onUnauthorized: invalidateSession }),
      listLimits({ token, signal: controller.signal, onUnauthorized: invalidateSession }),
    ])
      .then(([machineResult, variableResult, limitResult]) => {
        if (requestId !== requestRef.current) return;
        setMachines(machineResult);
        setVariables(variableResult);
        setLimits(limitResult);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setErrorMessage(safeError(error, "list"));
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });

    return () => {
      controller.abort();
      requestRef.current += 1;
    };
  }, [invalidateSession, token]);

  const submitLimit = async (body) => {
    setErrorMessage("");
    setFormMessage("");
    setSaving(true);
    const selectedId = selectedLimit?.id_limite;

    try {
      const savedLimit = selectedId
        ? await updateLimit(selectedId, body, { token, onUnauthorized: invalidateSession })
        : await createLimit(body, { token, onUnauthorized: invalidateSession });

      setLimits((current) => {
        const next = selectedId
          ? current.map((limit) => limit.id_limite === savedLimit.id_limite ? savedLimit : limit)
          : [...current, savedLimit];
        return next.sort((a, b) => a.id_limite - b.id_limite);
      });
      setSelectedLimit(null);
      setFormMessage(selectedId ? "El límite se actualizó correctamente." : "El límite se creó correctamente.");
    } catch (error) {
      setErrorMessage(safeError(error, "form"));
    } finally {
      setSaving(false);
    }
  };

  const existingPairs = new Set(limits.map((limit) => `${limit.id_maquina}-${limit.id_variable}`));

  return (
    <section className="users-page limits-page" aria-labelledby="limits-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">CONFIGURACIÓN</span>
          <h1 id="limits-title">Límites de monitoreo</h1>
          <p>Definí el valor máximo permitido por variable para cada máquina.</p>
        </div>
        <span className="users-count">{loading ? "Cargando…" : `${limits.length} límites`}</span>
      </div>

      {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}
      {formMessage && <div className="users-alert users-alert-success" role="status">{formMessage}</div>}

      <div className="users-workspace">
        <section className="users-list-card" aria-labelledby="limits-list-title">
          <div className="users-card-heading">
            <h2 id="limits-list-title">Límites configurados</h2>
            <span>{loading ? "…" : limits.length}</span>
          </div>
          {loading ? (
            <div className="users-inline-loading" role="status">Cargando configuraciones…</div>
          ) : errorMessage ? null : limits.length === 0 ? (
            <div className="users-empty">No hay límites configurados.</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Máquina</th>
                    <th scope="col">Variable</th>
                    <th scope="col">Valor máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((limit) => {
                    const isSelected = selectedLimit?.id_limite === limit.id_limite;
                    return (
                      <tr key={limit.id_limite} className={isSelected ? "is-selected" : ""}>
                        <td>
                          <button
                            className="user-select-button"
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => canManage && setSelectedLimit(limit)}
                          >
                            <span className="user-full-name">{limit.nombre_maquina}</span>
                            <span className="user-handle">{limit.codigo_maquina}</span>
                          </button>
                        </td>
                        <td>{limit.nombre_variable}</td>
                        <td>{limit.valor_maximo} {limit.unidad}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="users-editor-card" aria-labelledby="limit-form-title" aria-live="polite">
          {canManage ? (
            <LimitForm
              key={selectedLimit?.id_limite ?? "new-limit"}
              limit={selectedLimit}
              machines={machines}
              variables={variables}
              existingPairs={existingPairs}
              saving={saving}
              onCancel={() => setSelectedLimit(null)}
              onSubmit={submitLimit}
            />
          ) : (
            <div className="users-editor-empty">
              <span className="users-empty-icon" aria-hidden="true">◎</span>
              <h2 id="limit-form-title">Consulta de límites</h2>
              <p>Podés revisar las configuraciones actuales según tu rol. La edición está reservada al administrador.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default LimitsPage;
