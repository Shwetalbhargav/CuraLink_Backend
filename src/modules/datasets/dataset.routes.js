const { Router } = require("express");

const { uploadDataset, listDatasets, getDataset, updateDataset } = require("./dataset.controller");

const datasetRouter = Router();

datasetRouter.post("/upload", uploadDataset);
datasetRouter.get("/", listDatasets);
datasetRouter.get("/:datasetId", getDataset);
datasetRouter.patch("/:datasetId", updateDataset);

module.exports = { datasetRouter };
