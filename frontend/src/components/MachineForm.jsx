import { useState } from "react";

const initialForm = {
  codigo: "",
  nombre: "",
  tipo: "",
  descripcion: "",
  ubicacion: "",
};

const validate = (form) => {
  const codigo = form.codigo.trim().toUpperCase();
  if (!codigo || codigo.length > 50) return "El código es obligatorio y admite hasta 50 caracteres.";
  if (!/^[A-Z0-9_-]+$/.test(codigo)) return "El código solo puede contener letras mayúsculas, números, guiones y guiones bajos.";
  if (!form.nombre.trim() || form.nombre.trim().length > 100) return "El nombre es obligatorio y admite hasta 100 caracteres.";
  if (!form.tipo.trim() || form.tipo.trim().length > 100) return "El tipo es obligatorio y admite hasta 100 caracteres.";
  if (form.descripcion.trim().length > 500) return "La descripción no puede superar los 500 caracteres.";
  if (form.ubicacion.trim().length > 150) return "La ubicación no puede superar los 150 caracteres.";
  return "";
};

const MachineForm = ({ machine, saving, onSubmit, onCancel }) => {
  const isEditing = machine !== null;
  const [form, setForm] = useState(() => machine
    ? {
        codigo: machine.codigo,
        nombre: machine.nombre,
        tipo: machine.tipo,
        descripcion: machine.descripcion ?? "",
        ubicacion: machine.ubicacion ?? "",
      }
    : initialForm);
  const [validationError, setValidationError] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validate(form);
    if (error) {
      setValidationError(error);
      return;
    }

    onSubmit({
      codigo: form.codigo,
      nombre: form.nombre,
      tipo: form.tipo,
      descripcion: form.descripcion,
      ubicacion: form.ubicacion,
    });
  };

  return (
    <div className="user-editor">
      <div className="users-card-heading editor-heading">
        <div>
          <span className="eyebrow">{isEditing ? "MÁQUINA SELECCIONADA" : "NUEVA MÁQUINA"}</span>
          <h2 id="machine-form-title">{isEditing ? "Editar máquina" : "Registrar máquina"}</h2>
        </div>
        {isEditing && (
          <span className={`user-status ${machine.activo ? "is-active" : "is-inactive"}`}>
            <span aria-hidden="true" />{machine.activo ? "Activa" : "Inactiva"}
          </span>
        )}
      </div>

      {isEditing && (
        <div className="user-readonly-summary">
          <span className="user-avatar" aria-hidden="true">{(machine.nombre?.[0] || "M").toUpperCase()}</span>
          <div>
            <strong>{machine.nombre}</strong>
            <span>{machine.codigo} · {machine.tipo}</span>
          </div>
        </div>
      )}

      <form className="user-edit-form" onSubmit={handleSubmit}>
        <div className="user-form-grid">
          <div className="form-field">
            <label htmlFor="machine-code">Código</label>
            <input id="machine-code" name="codigo" required maxLength={50} autoComplete="off" value={form.codigo} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor="machine-name">Nombre</label>
            <input id="machine-name" name="nombre" required maxLength={100} autoComplete="off" value={form.nombre} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor="machine-type">Tipo</label>
            <input id="machine-type" name="tipo" required maxLength={100} autoComplete="off" value={form.tipo} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field">
            <label htmlFor="machine-location">Ubicación</label>
            <input id="machine-location" name="ubicacion" maxLength={150} autoComplete="off" value={form.ubicacion} onChange={updateField} disabled={saving} />
          </div>
          <div className="form-field user-password-field">
            <label htmlFor="machine-description">Descripción</label>
            <input id="machine-description" name="descripcion" maxLength={500} value={form.descripcion} onChange={updateField} disabled={saving} />
            <span className="field-hint">Opcional; puede usarse para describir el área o función.</span>
          </div>
        </div>

        {validationError && <div className="users-alert users-alert-error" role="alert">{validationError}</div>}

        <div className="user-form-actions">
          <button className="button button-quiet" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? <><span className="button-spinner" aria-hidden="true" />Guardando…</> : isEditing ? "Guardar cambios" : "Registrar máquina"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MachineForm;
