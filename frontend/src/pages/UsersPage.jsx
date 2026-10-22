import { useEffect, useRef, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import {
  getUser,
  listUsers,
  SensitiveUserResponseError,
} from "../api/users.js";
import { useAuth } from "../auth/auth.js";
import UserEditor from "../components/UserEditor.jsx";

const getSafeErrorMessage = (error, context) => {
  if (error instanceof SensitiveUserResponseError) {
    return "La respuesta de la API contiene un campo sensible. Se detuvo la pantalla; avisá al responsable técnico.";
  }

  if (error instanceof NetworkError || error?.status === 0) {
    return "No se pudo conectar con el servidor. Intentá nuevamente.";
  }

  if (error instanceof ApiError) {
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para consultar usuarios.";
    if (error.status === 404 && context === "detail") return "El usuario seleccionado ya no está disponible.";
    if (error.status === 409) return "Los datos entran en conflicto con otro usuario.";
    if (error.status >= 500) return "El servidor no pudo completar la solicitud.";
    return context === "detail"
      ? "No se pudo consultar el usuario seleccionado."
      : "No se pudo cargar la lista de usuarios.";
  }

  return context === "detail"
    ? "No se pudo consultar el usuario seleccionado."
    : "No se pudo cargar la lista de usuarios.";
};

const isUserSummaryValid = (user) =>
  user !== null &&
  typeof user === "object" &&
  Number.isSafeInteger(user.id_usuario) &&
  user.id_usuario > 0 &&
  typeof user.nombre === "string" &&
  typeof user.apellido === "string" &&
  typeof user.nombre_usuario === "string" &&
  typeof user.correo === "string" &&
  Number.isSafeInteger(user.id_rol) &&
  user.id_rol > 0 &&
  typeof user.rol === "string" &&
  typeof user.activo === "boolean";

const UsersPage = () => {
  const { token, invalidateSession } = useAuth();
  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [fatalSensitiveResponse, setFatalSensitiveResponse] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const detailRequestIdRef = useRef(0);
  const listRequestIdRef = useRef(0);
  const usersRef = useRef([]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestIdRef.current;

    listUsers({
      token,
      signal: controller.signal,
      onUnauthorized: invalidateSession,
    })
      .then((result) => {
        if (requestId !== listRequestIdRef.current) return;
        if (!result.every(isUserSummaryValid)) {
          throw new Error("La lista recibida tiene un formato inválido.");
        }
        usersRef.current = result;
        setUsers(result);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        if (requestId !== listRequestIdRef.current) return;
        if (error instanceof SensitiveUserResponseError) {
          setFatalSensitiveResponse(true);
          setUsers([]);
          setListError(getSafeErrorMessage(error, "list"));
          return;
        }
        setListError(getSafeErrorMessage(error, "list"));
      })
      .finally(() => {
        if (requestId === listRequestIdRef.current) {
          setListLoading(false);
        }
      });

    return () => {
      controller.abort();
      listRequestIdRef.current += 1;
    };
  }, [invalidateSession, reloadVersion, token]);

  useEffect(() => {
    if (selectedUserId === null || fatalSensitiveResponse) {
      return undefined;
    }

    const controller = new AbortController();
    const requestId = ++detailRequestIdRef.current;

    getUser(selectedUserId, {
      token,
      signal: controller.signal,
      onUnauthorized: invalidateSession,
    })
      .then((user) => {
        if (requestId !== detailRequestIdRef.current) return;
        const selectedSummary = usersRef.current.find(
          (item) => item.id_usuario === selectedUserId
        );
        if (
          !isUserSummaryValid(user) ||
          user.id_usuario !== selectedUserId ||
          !selectedSummary ||
          user.id_rol !== selectedSummary.id_rol
        ) {
          throw new Error("El perfil recibido no coincide con el usuario seleccionado.");
        }
        setSelectedUser(user);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        if (requestId !== detailRequestIdRef.current) return;
        if (error instanceof SensitiveUserResponseError) {
          setFatalSensitiveResponse(true);
          setUsers([]);
          setSelectedUser(null);
        }
        setDetailError(getSafeErrorMessage(error, "detail"));
      })
      .finally(() => {
        if (requestId === detailRequestIdRef.current) {
          setDetailLoading(false);
        }
      });

    return () => {
      controller.abort();
      detailRequestIdRef.current += 1;
    };
  }, [fatalSensitiveResponse, invalidateSession, selectedUserId, token]);

  const handleSaved = (updatedUser) => {
    if (!isUserSummaryValid(updatedUser)) {
      setFatalSensitiveResponse(true);
      setUsers([]);
      setSelectedUser(null);
      setDetailError("La respuesta de la API no es segura o no tiene el formato esperado. Se detuvo la pantalla.");
      return;
    }

    if (updatedUser.id_rol !== selectedUser?.id_rol || updatedUser.id_usuario !== selectedUserId) {
      setFatalSensitiveResponse(true);
      setUsers([]);
      setSelectedUser(null);
      setDetailError("La API devolvió datos distintos del perfil seleccionado. Se detuvo la pantalla.");
      return;
    }

    setSelectedUser(updatedUser);
    setUsers((currentUsers) => {
      const nextUsers = currentUsers.map((user) =>
        user.id_usuario === updatedUser.id_usuario ? updatedUser : user
      );
      usersRef.current = nextUsers;
      return nextUsers;
    });
  };

  const handleSensitiveResponse = () => {
    setFatalSensitiveResponse(true);
    setUsers([]);
    usersRef.current = [];
    setSelectedUser(null);
    setDetailError("La API devolvió información sensible. Se detuvo la pantalla; avisá al responsable técnico.");
  };

  const handleSelectUser = (userId) => {
    setSelectedUser(null);
    setDetailError("");
    setDetailLoading(true);
    setSelectedUserId(userId);
  };

  const handleRetryList = () => {
    setListError("");
    setListLoading(true);
    setReloadVersion((version) => version + 1);
  };

  if (fatalSensitiveResponse) {
    return (
      <section className="users-page" aria-labelledby="users-title">
        <div className="users-heading">
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1 id="users-title">Gestión de usuarios</h1>
        </div>
        <div className="users-alert users-alert-error" role="alert">
          {listError || detailError || "Se detectó información sensible en una respuesta. Se detuvo la pantalla."}
        </div>
      </section>
    );
  }

  return (
    <section className="users-page" aria-labelledby="users-title">
      <div className="users-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1 id="users-title">Gestión de usuarios</h1>
          <p>Consultá perfiles y editá sus datos existentes.</p>
        </div>
        <span className="users-count">{listLoading ? "Cargando…" : `${users.length} usuarios`}</span>
      </div>

      {listError && (
        <div className="users-alert users-alert-error" role="alert">
          <span>{listError}</span>
          <button className="button button-quiet" type="button" onClick={handleRetryList}>
            Reintentar
          </button>
        </div>
      )}

      <div className="users-workspace">
        <section className="users-list-card" aria-labelledby="users-list-title">
          <div className="users-card-heading">
            <h2 id="users-list-title">Usuarios</h2>
            <span>{listLoading ? "…" : users.length}</span>
          </div>

          {listLoading ? (
            <div className="users-inline-loading" role="status">Cargando usuarios…</div>
          ) : listError ? null : users.length === 0 ? (
            <div className="users-empty">No hay usuarios para mostrar.</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Usuario</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelected = user.id_usuario === selectedUserId;
                    return (
                      <tr key={user.id_usuario} className={isSelected ? "is-selected" : ""}>
                        <td>
                          <button
                            className="user-select-button"
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleSelectUser(user.id_usuario)}
                          >
                            <span className="user-full-name">{user.nombre} {user.apellido}</span>
                            <span className="user-handle">@{user.nombre_usuario}</span>
                          </button>
                        </td>
                        <td><span className="role-badge">{user.rol}</span></td>
                        <td>
                          <span className={`user-status ${user.activo ? "is-active" : "is-inactive"}`}>
                            <span aria-hidden="true" />{user.activo ? "Activo" : "Inactivo"}
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

        <section className="users-editor-card" aria-labelledby="user-detail-title" aria-live="polite">
          {selectedUserId === null ? (
            <div className="users-editor-empty">
              <span className="users-empty-icon" aria-hidden="true">◎</span>
              <h2 id="user-detail-title">Seleccioná un usuario</h2>
              <p>Elegí un perfil de la lista para consultar o editar sus datos.</p>
            </div>
          ) : detailLoading ? (
            <div className="users-inline-loading" role="status">Consultando perfil…</div>
          ) : detailError ? (
            <div className="users-alert users-alert-error" role="alert">{detailError}</div>
          ) : selectedUser?.id_usuario !== selectedUserId ? (
            <div className="users-inline-loading" role="status">Consultando perfil…</div>
          ) : selectedUser ? (
            <UserEditor
              key={selectedUser.id_usuario}
              user={selectedUser}
              onCancel={() => setSelectedUserId(null)}
              onSaved={handleSaved}
              onSensitiveResponse={handleSensitiveResponse}
              token={token}
              onUnauthorized={invalidateSession}
            />
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default UsersPage;
