const { randomUUID } = require("crypto");

const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");

const datasets = new Map();

const datasetService = {
  describeModule() {
    return {
      module: "datasets",
      capabilities: [
        "dataset-metadata",
        "upload-records",
        "processing-status",
      ],
      endpoints: {
        upload: "/api/v1/datasets/upload",
        list: "/api/v1/datasets",
        get: "/api/v1/datasets/:datasetId",
        update: "/api/v1/datasets/:datasetId",
      },
    };
  },

  createDataset(payload = {}) {
    const dataset = {
      datasetId: randomUUID(),
      name: normalizePhrase(payload.name) || "Untitled dataset",
      fileName: normalizePhrase(payload.fileName),
      fileType: normalizePhrase(payload.fileType) || "unknown",
      sizeBytes: Number(payload.sizeBytes) || 0,
      status: normalizePhrase(payload.status) || "uploaded",
      source: normalizePhrase(payload.source) || "manual-upload",
      notes: normalizePhrase(payload.notes),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    datasets.set(dataset.datasetId, dataset);
    return dataset;
  },

  listDatasets() {
    return {
      items: [...datasets.values()].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    };
  },

  getDataset(datasetId) {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      throw new AppError("Dataset not found", HTTP_STATUS.NOT_FOUND);
    }

    return dataset;
  },

  updateDataset(datasetId, payload = {}) {
    const dataset = this.getDataset(datasetId);
    const updated = {
      ...dataset,
      name: payload.name !== undefined ? normalizePhrase(payload.name) : dataset.name,
      fileName: payload.fileName !== undefined ? normalizePhrase(payload.fileName) : dataset.fileName,
      fileType: payload.fileType !== undefined ? normalizePhrase(payload.fileType) : dataset.fileType,
      sizeBytes: payload.sizeBytes !== undefined ? Number(payload.sizeBytes) || 0 : dataset.sizeBytes,
      status: payload.status !== undefined ? normalizePhrase(payload.status) || dataset.status : dataset.status,
      source: payload.source !== undefined ? normalizePhrase(payload.source) : dataset.source,
      notes: payload.notes !== undefined ? normalizePhrase(payload.notes) : dataset.notes,
      updatedAt: new Date().toISOString(),
    };

    datasets.set(datasetId, updated);
    return updated;
  },
};

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { datasetService };
