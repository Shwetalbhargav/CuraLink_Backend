const { Conversation } = require("./conversation.model");

const conversationRepository = {
  async create(document) {
    const created = await Conversation.create({
      conversationId: document.conversationId,
      patientName: document.patientName,
      disease: document.disease,
      intent: document.intent,
      location: document.location,
      notes: document.notes,
      summary: document.summary,
      title: document.title,
      status: document.status,
      tags: document.tags || [],
      archived: Boolean(document.archived),
      sessionId: document.sessionId,
      turnsCount: document.turnsCount || 0,
      lastMessageAt: document.lastMessageAt ? new Date(document.lastMessageAt) : null,
    });

    return mapDocument(created);
  },

  async findByConversationId(conversationId) {
    const document = await Conversation.findOne({ conversationId }).lean();
    return document ? mapDocument(document) : null;
  },

  async list({ status, search, archived, page = 1, limit = 20 } = {}) {
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (typeof archived === "boolean") {
      query.archived = archived;
    }

    if (search) {
      query.$or = [
        { title: new RegExp(escapeRegex(search), "i") },
        { disease: new RegExp(escapeRegex(search), "i") },
        { summary: new RegExp(escapeRegex(search), "i") },
        { patientName: new RegExp(escapeRegex(search), "i") },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Conversation.countDocuments(query);
    const documents = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      items: documents.map(mapDocument),
      total,
      page,
      limit,
      hasMore: skip + documents.length < total,
    };
  },

  async save(conversation) {
    const document = await Conversation.findOneAndUpdate(
      { conversationId: conversation.conversationId },
      {
        $set: {
          patientName: conversation.patientName || "",
          disease: conversation.disease || "",
          intent: conversation.intent || "",
          location: conversation.location || "",
          notes: conversation.notes || "",
          summary: conversation.summary || "",
          title: conversation.title || "",
          status: conversation.status || "active",
          tags: Array.isArray(conversation.tags) ? conversation.tags : [],
          archived: Boolean(conversation.archived),
          sessionId: conversation.sessionId || "",
          turnsCount: conversation.turnsCount || 0,
          lastMessageAt: conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: conversation.createdAt ? new Date(conversation.createdAt) : new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        lean: true,
      }
    );

    return mapDocument(document);
  },
};

function mapDocument(document) {
  return {
    conversationId: document.conversationId,
    patientName: document.patientName || "",
    disease: document.disease || "",
    intent: document.intent || "",
    location: document.location || "",
    notes: document.notes || "",
    summary: document.summary || "",
    title: document.title || "",
    status: document.status || "active",
    tags: Array.isArray(document.tags) ? document.tags : [],
    archived: Boolean(document.archived),
    sessionId: document.sessionId || "",
    turnsCount: document.turnsCount || 0,
    lastMessageAt: document.lastMessageAt ? new Date(document.lastMessageAt).toISOString() : null,
    createdAt: new Date(document.createdAt).toISOString(),
    updatedAt: new Date(document.updatedAt).toISOString(),
  };
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { conversationRepository };
