import { findAllMachines } from "../repositories/machine.repository.js";

export const getAllMachines = async () => {
  const machines = await findAllMachines();

  return machines.map((machine) => ({
    ...machine,
    activo: Boolean(machine.activo),
  }));
};
