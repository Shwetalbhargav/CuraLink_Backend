const { HTTP_STATUS } = require("../../constants/httpStatus");
const { supportService } = require("./support.service");

function listSupportFaqs(req, res) {
  res.status(HTTP_STATUS.OK).json(supportService.listFaqs());
}

function createSupportRequest(req, res) {
  res.status(HTTP_STATUS.CREATED).json(supportService.createRequest(req.body || {}));
}

function getSupportStatus(req, res) {
  res.status(HTTP_STATUS.OK).json(supportService.getStatus());
}

module.exports = { listSupportFaqs, createSupportRequest, getSupportStatus };
