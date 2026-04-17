const { randomUUID } = require("crypto");

const { isDatabaseConnected } = require("../../config/database");
const { chatRepository } = require("./chat.repository");

const sessions = new Map();

function buildDefaultState(seed = {}) {
  return {
    sessionId: randomUUID(),
    conversationId: seed.conversationId || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      conversationId: seed.conversationId || "",
      patientName: seed.patientName || "",
      disease: seed.disease || "",
      location: seed.location || "",
      lastIntent: seed.intent || "",
      lastQuery: "",
      lastTopic: "",
      filters: {},
    },
    history: [],
  };
}

const chatStore = {
  async create(seed) {
    const session = buildDefaultState(seed);

    if (isDatabaseConnected()) {
      return chatRepository.create(session);
    }

    sessions.set(session.sessionId, session);
    return session;
  },

  async get(sessionId) {
    if (isDatabaseConnected()) {
      return chatRepository.findBySessionId(sessionId);
    }

    return sessions.get(sessionId) || null;
  },

  async save(session, newTurns = []) {
    session.updatedAt = new Date().toISOString();

    if (isDatabaseConnected()) {
      return chatRepository.save(session, newTurns);
    }

    sessions.set(session.sessionId, session);
    return session;
  },
};

module.exports = { chatStore };
