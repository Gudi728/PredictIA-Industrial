import {
  findAllVariables,
} from "../repositories/variable.repository.js";

export const getAllVariables = async () => {
  const variables = await findAllVariables();

  return variables.map((variable) => ({
    ...variable,
    activo: Boolean(variable.activo),
  }));
};
