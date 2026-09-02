import { getAllMachines } from "../services/machine.service.js";

export const listMachines = async (req, res, next) => {
  try {
    const machines = await getAllMachines();

    res.status(200).json({
      success: true,
      message: "Máquinas obtenidas correctamente",
      count: machines.length,
      data: machines,
    });
  } catch (error) {
    next(error);
  }
};
