const { HTTP_STATUS } = require("../../constants/httpStatus");
const { exportService } = require("./export.service");

async function exportReport(req, res) {
  res.status(HTTP_STATUS.OK).json(await exportService.exportReport(req.body || {}));
}

function exportProtocol(req, res) {
  res.status(HTTP_STATUS.OK).json(exportService.exportProtocol(req.body || {}));
}

function exportLibraryCsv(req, res) {
  res.status(HTTP_STATUS.OK).json(exportService.exportLibraryCsv(req.body || {}));
}

module.exports = { exportReport, exportProtocol, exportLibraryCsv };
