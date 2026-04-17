const { randomUUID } = require("crypto");

const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");

const libraryItems = new Map();
const libraryFolders = new Map();

const libraryService = {
  describeModule() {
    return {
      module: "library",
      capabilities: [
        "saved-items",
        "folders",
        "status-tracking",
        "archive-support",
      ],
      endpoints: {
        listItems: "/api/v1/library",
        createItem: "/api/v1/library/items",
        updateItem: "/api/v1/library/items/:itemId",
        deleteItem: "/api/v1/library/items/:itemId",
        listFolders: "/api/v1/library/folders",
        createFolder: "/api/v1/library/folders",
      },
    };
  },

  listItems(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const search = normalizePhrase(query.search).toLowerCase();
    const folderId = normalizePhrase(query.folderId);
    const status = normalizePhrase(query.status).toLowerCase();
    const archived =
      query.archived === undefined || query.archived === ""
        ? undefined
        : String(query.archived).toLowerCase() === "true";

    let items = [...libraryItems.values()];

    if (search) {
      items = items.filter((item) =>
        [item.title, item.summary, item.type, ...(item.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    if (folderId) {
      items = items.filter((item) => item.folderId === folderId);
    }

    if (status) {
      items = items.filter((item) => item.status.toLowerCase() === status);
    }

    if (typeof archived === "boolean") {
      items = items.filter((item) => item.archived === archived);
    }

    items.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return {
      items: paged,
      total: items.length,
      page,
      limit,
      hasMore: start + paged.length < items.length,
    };
  },

  createItem(payload = {}) {
    const item = buildLibraryItem(payload);
    libraryItems.set(item.itemId, item);
    return item;
  },

  updateItem(itemId, payload = {}) {
    const existing = libraryItems.get(itemId);
    if (!existing) {
      throw new AppError("Library item not found", HTTP_STATUS.NOT_FOUND);
    }

    const updated = {
      ...existing,
      title: payload.title !== undefined ? normalizePhrase(payload.title) : existing.title,
      summary: payload.summary !== undefined ? normalizePhrase(payload.summary) : existing.summary,
      status: payload.status !== undefined ? normalizePhrase(payload.status) || existing.status : existing.status,
      tags: payload.tags !== undefined ? normalizeTags(payload.tags) : existing.tags,
      archived: payload.archived !== undefined ? Boolean(payload.archived) : existing.archived,
      folderId: payload.folderId !== undefined ? normalizePhrase(payload.folderId) : existing.folderId,
      metadata: payload.metadata !== undefined ? payload.metadata || {} : existing.metadata,
      updatedAt: new Date().toISOString(),
    };

    libraryItems.set(itemId, updated);
    return updated;
  },

  deleteItem(itemId) {
    const existing = libraryItems.get(itemId);
    if (!existing) {
      throw new AppError("Library item not found", HTTP_STATUS.NOT_FOUND);
    }

    libraryItems.delete(itemId);
    return { deleted: true, itemId };
  },

  listFolders() {
    const items = [...libraryFolders.values()].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    return { items };
  },

  createFolder(payload = {}) {
    const folder = {
      folderId: randomUUID(),
      name: normalizePhrase(payload.name) || "Untitled Folder",
      description: normalizePhrase(payload.description),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    libraryFolders.set(folder.folderId, folder);
    return folder;
  },
};

function buildLibraryItem(payload = {}) {
  return {
    itemId: randomUUID(),
    type: normalizePhrase(payload.type) || "publication",
    title: normalizePhrase(payload.title) || "Untitled item",
    summary: normalizePhrase(payload.summary),
    sourceId: normalizePhrase(payload.sourceId),
    source: normalizePhrase(payload.source),
    url: normalizePhrase(payload.url),
    status: normalizePhrase(payload.status) || "saved",
    tags: normalizeTags(payload.tags),
    archived: Boolean(payload.archived),
    folderId: normalizePhrase(payload.folderId),
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => normalizePhrase(tag)).filter(Boolean))];
}

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { libraryService };
