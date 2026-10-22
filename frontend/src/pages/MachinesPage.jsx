import { useEffect, useRef, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { createMachine, listMachines, updateMachine } from "../api/machines.js";
import { useAuth } from "../auth/auth.js";
import MachineForm from "../components/MachineForm.jsx";

const safeError = (error, context) => {
  if (error instanceof NetworkError || error?.status === 0) return "No se pudo conectar con el servidor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar o editar máquinas.";
    if (error.status === 404) return "La máquina no está disponible.";
    if (error.status === 409) return "El código de máquina ya está registrado.";
    if (error.status === 400) return "Revisá los datos ingresados.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
  }
  return context === "list" ? "No se pudo cargar la lista de máquinas." : "No se pudieron guardar los cambios.";
};

const MachinesPage = () => {
  const { token, user, invalidateSession } = useAuth();
  const isAdministrator = user.rol === "administrador";
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const listRequestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestRef.current;

    listMachines({
      token,
      signal: controller.signal,
      onUnauthorized: invalidateSession,
    })
      .then((result) => {
        if (requestId !== listRequestRef.current) return;
        setMachines(result);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setErrorMessage(safeError(error, "list"));
      })
      .finally(() => {
        if (requestId === listRequestRef.current) setLoading(false);
      });

    return () => {
      controller.abort();
      listRequestRef.current += 1;
    };
  }, [invalidateSession, token]);

  const submitMachine = async (body) => {
    setErrorMessage("");
    setFormMessage("");
    setSaving(true);
    const selectedId = selectedMachine?.id_maquina;

    try {
      const savedMachine = selectedId
        ? await updateMachine(selectedId, body, { token, onUnauthorized: invalidateSession })
        : await createMachine(body, { token, onUnauthorized: invalidateSession });

      setMachines((current) => {
        if (selectedId) {
          return current.map((machine) => machine.id_maquina === savedMachine.id_maquina ? savedMachine : machine);
        }
        return [...current, savedMachine].sort((a, b) => a.id_maquina - b.id_maquina);
      });
      setSelectedMachine(null);
      setFormMessage(selectedId ? "La máquina se actualizó correctamente." : "La máquina se registró correctamente.");
    } catch (error) {
      setErrorMessage(safeError(error, "form"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="users-page machines-page" aria-labelledby="machines-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">MONITOREO</span>
          <h1 id="machines-title">Gestión de máquinas</h1>
          <p>Consultá y administrá las máquinas monitoreadas.</p>
        </div>
        <span className="users-count">{loading ? "Cargando…" : `${machines.length} máquinas`}</span>
      </div>

      {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}
      {formMessage && <div className="users-alert users-alert-success" role="status">{formMessage}</div>}

      <div className="users-workspace">
        <section className="users-list-card" aria-labelledby="machines-list-title">
          <div className="users-card-heading">
            <h2 id="machines-list-title">Máquinas</h2>
            <span>{loading ? "…" : machines.length}</span>
          </div>
          {loading ? (
            <div className="users-inline-loading" role="status">Cargando máquinas…</div>
          ) : errorMessage ? null : machines.length === 0 ? (
            <div className="users-empty">No hay máquinas para mostrar.</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Máquina</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => {
                    const isSelected = selectedMachine?.id_maquina === machine.id_maquina;
                    return (
                      <tr key={machine.id_maquina} className={isSelected ? "is-selected" : ""}>
                        <td>
                          <button
                            className="user-select-button"
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => isAdministrator && setSelectedMachine(machine)}
                          >
                            <span className="user-full-name">{machine.nombre}</span>
                            <span className="user-handle">{machine.codigo}</span>
                          </button>
                        </td>
                        <td>{machine.tipo}</td>
                        <td>
                          <span className={`user-status ${machine.activo ? "is-active" : "is-inactive"}`}>
                            <span aria-hidden="true" />{machine.activo ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="users-editor-card" aria-labelledby="machine-form-title" aria-live="polite">
          {isAdministrator ? (
            <MachineForm
              key={selectedMachine?.id_maquina ?? "new-machine"}
              machine={selectedMachine}
              saving={saving}
              onCancel={() => setSelectedMachine(null)}
              onSubmit={submitMachine}
            />
          ) : (
            <div className="users-editor-empty">
              <span className="users-empty-icon" aria-hidden="true">◎</span>
              <h2 id="machine-form-title">Consulta de máquinas</h2>
              <p>Podés consultar las máquinas disponibles según tu rol. La edición está reservada al administrador.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default MachinesPage;
