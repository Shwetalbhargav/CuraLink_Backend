const { Router } = require("express");

const { exportReport, exportProtocol, exportLibraryCsv } = require("./export.controller");

const exportRouter = Router();

exportRouter.post("/report", exportReport);
exportRouter.post("/protocol", exportProtocol);
exportRouter.post("/library-csv", exportLibraryCsv);

module.exports = { exportRouter };
