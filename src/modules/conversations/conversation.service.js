const { randomUUID } = require("crypto");

const { isDatabaseConnected } = require("../../config/database");
const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");
const { conversationRepository } = require("./conversation.repository");

const conversations = new Map();

const conversationService = {
  async createConversation(payload) {
    const conversation = buildConversation(payload);

    if (isDatabaseConnected()) {
      return conversationRepository.create(conversation);
    }

    conversations.set(conversation.conversationId, conversation);
    return conversation;
  },

  async listConversations(filters = {}) {
    if (isDatabaseConnected()) {
      return conversationRepository.list(normalizeConversationFilters(filters));
    }

    const normalizedFilters = normalizeConversationFilters(filters);
    const filtered = [...conversations.values()]
      .filter((item) => matchesConversationFilters(item, normalizedFilters))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
    const start = (normalizedFilters.page - 1) * normalizedFilters.limit;
    const items = filtered.slice(start, start + normalizedFilters.limit);

    return {
      items,
      total: filtered.length,
      page: normalizedFilters.page,
      limit: normalizedFilters.limit,
      hasMore: start + items.length < filtered.length,
    };
  },

  async getConversation(conversationId) {
    const conversation = isDatabaseConnected()
      ? await conversationRepository.findByConversationId(conversationId)
      : conversations.get(conversationId) || null;

    if (!conversation) {
      throw new AppError("Conversation not found", HTTP_STATUS.NOT_FOUND);
    }

    return conversation;
  },

  async ensureConversation(payload = {}) {
    if (payload.conversationId) {
      return this.getConversation(payload.conversationId);
    }

    return this.createConversation(payload);
  },

  async syncFromSession({ conversationId, sessionId, context, history, summary }) {
    if (!conversationId) {
      return null;
    }

    const existing = isDatabaseConnected()
      ? await conversationRepository.findByConversationId(conversationId)
      : conversations.get(conversationId) || null;

    const baseConversation = existing || buildConversation({ conversationId });
    const updatedConversation = {
      ...baseConversation,
      patientName: context?.patientName || baseConversation.patientName,
      disease: context?.disease || baseConversation.disease,
      intent: context?.lastIntent || baseConversation.intent,
      location: context?.location || baseConversation.location,
      summary: summary || baseConversation.summary,
      title: baseConversation.title || buildConversationTitle(baseConversation, context),
      sessionId: sessionId || baseConversation.sessionId,
      turnsCount: Array.isArray(history) ? history.length : baseConversation.turnsCount,
      lastMessageAt: extractLastMessageAt(history) || baseConversation.lastMessageAt,
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      return conversationRepository.save(updatedConversation);
    }

    conversations.set(updatedConversation.conversationId, updatedConversation);
    return updatedConversation;
  },

  async updateConversation(conversationId, payload = {}) {
    const existing = await this.getConversation(conversationId);
    const archived =
      payload.archived !== undefined ? Boolean(payload.archived) : existing.archived;
    const status =
      payload.status !== undefined
        ? normalizePhrase(payload.status)
        : archived
          ? "archived"
          : existing.status === "archived"
            ? "active"
            : existing.status;
    const updated = {
      ...existing,
      title: payload.title !== undefined ? normalizePhrase(payload.title) : existing.title,
      notes: payload.notes !== undefined ? normalizePhrase(payload.notes) : existing.notes,
      summary: payload.summary !== undefined ? normalizePhrase(payload.summary) : existing.summary,
      status,
      tags: payload.tags !== undefined ? normalizeTags(payload.tags) : existing.tags,
      archived,
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      return conversationRepository.save(updated);
    }

    conversations.set(updated.conversationId, updated);
    return updated;
  },

  async archiveConversation(conversationId) {
    return this.updateConversation(conversationId, {
      archived: true,
      status: "archived",
    });
  },

  async unarchiveConversation(conversationId) {
    return this.updateConversation(conversationId, {
      archived: false,
      status: "active",
    });
  },

  async listCapabilities() {
    const conversationsList = await this.listConversations();

    return {
      feature: "conversations",
      capabilities: [
        "conversation-persistence",
        "session-linking",
        "follow-up-context-chain",
      ],
      count: conversationsList.total || conversationsList.length || 0,
      endpoints: {
        list: "/api/v1/conversations",
        meta: "/api/v1/conversations/meta",
        get: "/api/v1/conversations/:conversationId",
        create: "/api/v1/conversations",
        update: "/api/v1/conversations/:conversationId",
        archive: "/api/v1/conversations/:conversationId/archive",
        unarchive: "/api/v1/conversations/:conversationId/unarchive",
      },
    };
  },
};

function buildConversation(payload = {}) {
  const now = new Date().toISOString();

  return {
    conversationId: payload.conversationId || randomUUID(),
    patientName: payload.patientName || "",
    disease: payload.disease || "",
    intent: payload.intent || "",
    location: payload.location || "",
    notes: payload.notes || "",
    summary: payload.summary || "",
    title: payload.title || buildConversationTitle(payload),
    tags: normalizeTags(payload.tags),
    archived: Boolean(payload.archived),
    sessionId: payload.sessionId || "",
    turnsCount: payload.turnsCount || 0,
    lastMessageAt: payload.lastMessageAt || null,
    status: payload.status || "active",
    createdAt: payload.createdAt || now,
    updatedAt: payload.updatedAt || now,
  };
}

function extractLastMessageAt(history = []) {
  const lastTurn = history[history.length - 1];
  return lastTurn?.at || null;
}

function normalizeConversationFilters(filters = {}) {
  return {
    status: normalizePhrase(filters.status) || "all",
    search: normalizePhrase(filters.search),
    archived:
      filters.archived === undefined || filters.archived === null || filters.archived === ""
        ? undefined
        : String(filters.archived).toLowerCase() === "true",
    page: Math.max(1, Number(filters.page) || 1),
    limit: Math.min(100, Math.max(1, Number(filters.limit) || 20)),
  };
}

function matchesConversationFilters(item, filters) {
  if (filters.status !== "all" && item.status !== filters.status) {
    return false;
  }

  if (typeof filters.archived === "boolean" && Boolean(item.archived) !== filters.archived) {
    return false;
  }

  if (filters.search) {
    const haystack = [item.title, item.disease, item.summary, item.patientName].join(" ").toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function buildConversationTitle(payload = {}, context = {}) {
  const disease = normalizePhrase(context.disease || payload.disease);
  const topic = normalizePhrase(context.lastTopic || context.topic || payload.title || payload.intent);
  const patientName = normalizePhrase(context.patientName || payload.patientName);

  if (disease && topic) {
    return `${disease}: ${topic}`.slice(0, 120);
  }

  if (disease) {
    return `${disease} research session`;
  }

  if (patientName) {
    return `${patientName} research session`;
  }

  return "Research conversation";
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => normalizePhrase(tag)).filter(Boolean))].slice(0, 10);
}

function normalizePhrase(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

module.exports = { conversationService };
