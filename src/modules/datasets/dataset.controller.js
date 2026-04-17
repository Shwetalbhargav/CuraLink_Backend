const { HTTP_STATUS } = require("../../constants/httpStatus");
const { datasetService } = require("./dataset.service");

function uploadDataset(req, res) {
  res.status(HTTP_STATUS.CREATED).json(datasetService.createDataset(req.body || {}));
}

function listDatasets(req, res) {
  res.status(HTTP_STATUS.OK).json(datasetService.listDatasets());
}

function getDataset(req, res) {
  res.status(HTTP_STATUS.OK).json(datasetService.getDataset(req.params.datasetId));
}

function updateDataset(req, res) {
  res.status(HTTP_STATUS.OK).json(datasetService.updateDataset(req.params.datasetId, req.body || {}));
}

module.exports = { uploadDataset, listDatasets, getDataset, updateDataset };
