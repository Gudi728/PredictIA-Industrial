import { useState } from "react";

const validate = ({ machineId, variableId, maximumValue }) => {
  const idMachine = Number(machineId);
  const idVariable = Number(variableId);
  const valueText = String(maximumValue).trim();

  if (!Number.isSafeInteger(idMachine) || idMachine <= 0) return "Seleccioná una máquina válida.";
  if (!Number.isSafeInteger(idVariable) || idVariable <= 0) return "Seleccioná una variable válida.";
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(valueText)) return "El valor máximo debe ser un número mayor que cero con hasta dos decimales.";

  const value = Number(valueText);
  if (!Number.isFinite(value) || value < 0.01 || value > 99999999.99) {
    return "El valor máximo debe estar entre 0.01 y 99999999.99.";
  }
  return "";
};

const LimitForm = ({ limit, machines, variables, existingPairs, saving, onCancel, onSubmit }) => {
  const isEditing = limit !== null;
  const [machineId, setMachineId] = useState(limit ? String(limit.id_maquina) : "");
  const [variableId, setVariableId] = useState(limit ? String(limit.id_variable) : "");
  const [maximumValue, setMaximumValue] = useState(limit ? String(limit.valor_maximo) : "");
  const [validationError, setValidationError] = useState("");

  const selectedVariable = variables.find((item) => String(item.idVariable) === String(variableId));
  const pairAlreadyUsed = existingPairs.has(`${machineId}-${variableId}`) && !isEditing;

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validate({ machineId, variableId, maximumValue });
    if (error) {
      setValidationError(error);
      return;
    }

    if (pairAlreadyUsed) {
      setValidationError("Ya existe una configuración para esa máquina y variable. Seleccioná el límite existente para editarlo.");
      return;
    }

    onSubmit({
      id_maquina: Number(machineId),
      id_variable: Number(variableId),
      valor_maximo: Number(String(maximumValue).trim()),
    });
  };

  const resetSelection = () => {
    setMachineId("");
    setVariableId("");
    setMaximumValue("");
    setValidationError("");
    onCancel();
  };

  return (
    <div className="user-editor">
      <div className="users-card-heading editor-heading">
        <div>
          <span className="eyebrow">{isEditing ? "LÍMITE SELECCIONADO" : "NUEVO LÍMITE"}</span>
          <h2 id="limit-form-title">{isEditing ? "Editar límite" : "Crear límite"}</h2>
        </div>
        {isEditing && (
          <span className="user-status is-active">
            <span aria-hidden="true" />Configurado
          </span>
        )}
      </div>

      {isEditing && (
        <div className="user-readonly-summary">
          <span className="user-avatar" aria-hidden="true">{(limit.codigo_maquina?.[0] || "L").toUpperCase()}</span>
          <div>
            <strong>{limit.nombre_maquina}</strong>
            <span>{limit.nombre_variable} · {limit.valor_maximo} {limit.unidad}</span>
          </div>
        </div>
      )}

      <form className="user-edit-form" onSubmit={handleSubmit}>
        <div className="user-form-grid">
          <div className="form-field">
            <label htmlFor="limit-machine">Máquina</label>
            <select id="limit-machine" required value={machineId} onChange={(event) => setMachineId(event.target.value)} disabled={saving}>
              <option value="" disabled>Seleccionar máquina</option>
              {machines.map((machine) => (
                <option key={machine.id_maquina} value={machine.id_maquina} disabled={!machine.activo && !isEditing}>
                  {machine.nombre} ({machine.codigo}){!machine.activo ? " — inactiva" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="limit-variable">Variable</label>
            <select id="limit-variable" required value={variableId} onChange={(event) => setVariableId(event.target.value)} disabled={saving}>
              <option value="" disabled>Seleccionar variable</option>
              {variables.map((variable) => (
                <option key={variable.idVariable} value={variable.idVariable} disabled={!variable.activo && !isEditing}>
                  {variable.nombre} ({variable.unidad}){!variable.activo ? " — inactiva" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field user-password-field">
            <label htmlFor="limit-maximum">Valor máximo</label>
            <input id="limit-maximum" required inputMode="decimal" value={maximumValue} onChange={(event) => { setMaximumValue(event.target.value); setValidationError(""); }} disabled={saving} />
            <span className="field-hint">{selectedVariable ? `Unidad: ${selectedVariable.unidad}` : "Seleccioná una variable para conocer su unidad."}</span>
          </div>
        </div>

        {validationError && <div className="users-alert users-alert-error" role="alert">{validationError}</div>}
        {pairAlreadyUsed && <div className="users-alert users-alert-error" role="alert">La combinación ya está configurada.</div>}

        <div className="user-form-actions">
          <button className="button button-quiet" type="button" onClick={resetSelection} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving || pairAlreadyUsed}>
            {saving ? <><span className="button-spinner" aria-hidden="true" />Guardando…</> : isEditing ? "Guardar cambios" : "Crear límite"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LimitForm;
