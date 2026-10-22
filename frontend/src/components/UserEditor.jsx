import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, NetworkError } from "../api/apiClient.js";
import { SensitiveUserResponseError, updateUser } from "../api/users.js";

const validateProfile = (form) => {
  const nombre = form.nombre.trim();
  const apellido = form.apellido.trim();
  const nombreUsuario = form.nombre_usuario.trim();
  const correo = form.correo.trim();

  if (!nombre || nombre.length > 100) return "El nombre es obligatorio y admite hasta 100 caracteres.";
  if (!apellido || apellido.length > 100) return "El apellido es obligatorio y admite hasta 100 caracteres.";
  if (!nombreUsuario || nombreUsuario.length > 50) return "El nombre de usuario es obligatorio y admite hasta 50 caracteres.";
  if (!/^[a-z0-9._-]+$/.test(nombreUsuario.toLowerCase())) {
    return "El nombre de usuario contiene caracteres no permitidos.";
  }
  if (!correo || correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.toLowerCase())) {
    return "Ingresá un correo válido de hasta 150 caracteres.";
  }
  return "";
};

const getUpdateErrorMessage = (error) => {
  if (error instanceof SensitiveUserResponseError) {
    return "La respuesta de la API contiene un campo sensible. Se detuvo la pantalla; avisá al responsable técnico.";
  }
  if (error instanceof NetworkError || error?.status === 0) {
    return "No se pudo conectar con el servidor. El formulario sigue disponible.";
  }
  if (error instanceof ApiError) {
    if (error.status === 400) return "Revisá los datos ingresados y las validaciones del usuario.";
    if (error.status === 401) return "La sesión expiró. Iniciá sesión nuevamente.";
    if (error.status === 403) return "No tenés permisos para editar usuarios.";
    if (error.status === 404) return "El usuario ya no está disponible.";
    if (error.status === 409) return "El nombre de usuario o correo entra en conflicto con otra cuenta.";
    if (error.status >= 500) return "El servidor no pudo guardar los cambios.";
  }
  return "No se pudieron guardar los cambios. El formulario sigue disponible.";
};

const UserEditor = ({ user, token, onUnauthorized, onSaved, onSensitiveResponse, onCancel }) => {
  const original = useMemo(() => ({
    nombre: user.nombre,
    apellido: user.apellido,
    nombre_usuario: user.nombre_usuario,
    correo: user.correo,
    id_rol: user.id_rol,
    rol: user.rol,
    activo: user.activo,
  }), [user]);
  const [form, setForm] = useState(() => ({
    nombre: user.nombre,
    apellido: user.apellido,
    nombre_usuario: user.nombre_usuario,
    correo: user.correo,
  }));
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const passwordInputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    requestIdRef.current += 1;
    if (passwordInputRef.current) passwordInputRef.current.value = "";
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    setForm({
      nombre: original.nombre,
      apellido: original.apellido,
      nombre_usuario: original.nombre_usuario,
      correo: original.correo,
    });
    setNewPassword("");
    if (passwordInputRef.current) passwordInputRef.current.value = "";
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const profileError = validateProfile(form);
    if (profileError) {
      setErrorMessage(profileError);
      return;
    }

    if (newPassword !== "" && (newPassword.length < 8 || newPassword.length > 255)) {
      setErrorMessage("La nueva contraseña debe tener entre 8 y 255 caracteres.");
      return;
    }

    const body = {
      nombre: form.nombre,
      apellido: form.apellido,
      nombre_usuario: form.nombre_usuario,
      correo: form.correo,
      id_rol: original.id_rol,
    };
    if (newPassword !== "") body.contrasena = newPassword;

    const requestId = ++requestIdRef.current;
    setSaving(true);

    try {
      const updatedUser = await updateUser(user.id_usuario, body, {
        token,
        onUnauthorized,
      });

      if (requestId !== requestIdRef.current) return;

      if (
        updatedUser.id_usuario !== user.id_usuario ||
        updatedUser.id_rol !== original.id_rol ||
        updatedUser.rol !== original.rol ||
        updatedUser.activo !== original.activo
      ) {
        onSensitiveResponse();
        return;
      }

      setNewPassword("");
      if (passwordInputRef.current) passwordInputRef.current.value = "";
      setSuccessMessage("Los datos del usuario se guardaron correctamente.");
      onSaved(updatedUser);
      setForm({
        nombre: updatedUser.nombre,
        apellido: updatedUser.apellido,
        nombre_usuario: updatedUser.nombre_usuario,
        correo: updatedUser.correo,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof SensitiveUserResponseError) {
        onSensitiveResponse();
        return;
      }
      setNewPassword("");
      if (passwordInputRef.current) passwordInputRef.current.value = "";
      setErrorMessage(getUpdateErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setSaving(false);
    }
  };

  const hasChanges =
    form.nombre !== original.nombre ||
    form.apellido !== original.apellido ||
    form.nombre_usuario !== original.nombre_usuario ||
    form.correo !== original.correo ||
    newPassword !== "";

  return (
    <div className="user-editor">
      <div className="users-card-heading editor-heading">
        <div>
          <span className="eyebrow">PERFIL SELECCIONADO</span>
          <h2 id="user-detail-title">Editar usuario</h2>
        </div>
        <span className={`user-status ${original.activo ? "is-active" : "is-inactive"}`}>
          <span aria-hidden="true" />{original.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="user-readonly-summary">
        <span className="user-avatar" aria-hidden="true">
          {(original.nombre?.[0] || "U").toUpperCase()}{(original.apellido?.[0] || "").toUpperCase()}
        </span>
        <div>
          <strong>{original.nombre} {original.apellido}</strong>
          <span>@{original.nombre_usuario} · {original.rol}</span>
        </div>
      </div>

      <form className="user-edit-form" onSubmit={handleSubmit}>
        <div className="user-form-grid">
          <div className="form-field">
            <label htmlFor={`user-name-${user.id_usuario}`}>Nombre</label>
            <input id={`user-name-${user.id_usuario}`} name="nombre" maxLength={100} required value={form.nombre} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor={`user-surname-${user.id_usuario}`}>Apellido</label>
            <input id={`user-surname-${user.id_usuario}`} name="apellido" maxLength={100} required value={form.apellido} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor={`user-username-${user.id_usuario}`}>Nombre de usuario</label>
            <input id={`user-username-${user.id_usuario}`} name="nombre_usuario" maxLength={50} required autoComplete="off" value={form.nombre_usuario} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor={`user-email-${user.id_usuario}`}>Correo electrónico</label>
            <input id={`user-email-${user.id_usuario}`} name="correo" maxLength={150} required type="email" autoComplete="off" value={form.correo} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field user-role-field">
            <label>Rol (sin cambios)</label>
            <div className="readonly-field" aria-readonly="true">{original.rol}</div>
          </div>
          <div className="form-field user-password-field">
            <label htmlFor={`user-password-${user.id_usuario}`}>Nueva contraseña (opcional)</label>
            <input
              ref={passwordInputRef}
              id={`user-password-${user.id_usuario}`}
              name="contrasena"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={255}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              disabled={saving}
            />
            <span className="field-hint">Dejala vacía para conservar la contraseña actual.</span>
          </div>
        </div>

        {errorMessage && <div className="users-alert users-alert-error" role="alert">{errorMessage}</div>}
        {successMessage && <div className="users-alert users-alert-success" role="status">{successMessage}</div>}

        <div className="user-form-actions">
          <button className="button button-quiet" type="button" onClick={handleCancel} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving || !hasChanges}>
            {saving ? <><span className="button-spinner" aria-hidden="true" />Guardando…</> : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditor;
