import {
  changeMachineStatus,
  createMachine,
  getMachine,
  listMachines,
  updateMachine,
} from "../services/machine.service.js";

export const list = async (req, res, next) => {
  try {
    const machines = await listMachines(req.user);

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

export const getById = async (req, res, next) => {
  try {
    const machine = await getMachine(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: machine,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const machine = await createMachine(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "Máquina creada correctamente",
      data: machine,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const machine = await updateMachine(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Máquina actualizada correctamente",
      data: machine,
    });
  } catch (error) {
    next(error);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const machine = await changeMachineStatus(
      req.params.id,
      req.body.activo,
      req.user
    );

    res.status(200).json({
      success: true,
      message: req.body.activo
        ? "Máquina reactivada correctamente"
        : "Máquina desactivada correctamente",
      data: machine,
    });
  } catch (error) {
    next(error);
  }
};
