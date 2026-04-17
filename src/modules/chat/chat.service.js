const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");
const { chatStore } = require("./chat.store");
const { resolveContext } = require("./chatContext.service");
const { queryExpansionService } = require("../researchPipeline/queryExpansion.service");
const { retrievalService } = require("../researchPipeline/retrieval.service");
const { rankingService } = require("../researchPipeline/ranking.service");
const { reasoningService } = require("../reasoning/reasoning.service");
const { conversationService } = require("../conversations/conversation.service");
const { pythonRenderer } = require("../../services/python/pythonRenderer");

const chatService = {
  async createSession(payload) {
    const conversation = await conversationService.ensureConversation(payload || {});
    const session = await chatStore.create({
      ...payload,
      conversationId: conversation.conversationId,
      patientName: payload.patientName || conversation.patientName,
      disease: payload.disease || conversation.disease,
      location: payload.location || conversation.location,
      intent: payload.intent || conversation.intent,
    });

    await conversationService.syncFromSession({
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      context: session.context,
      history: session.history,
      summary: conversation.summary,
    });

    return {
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      context: session.context,
      greeting: "Hello, my name is CuraLink. I can help you explore research-backed medical information. How can I help you today?",
    };
  },

  async getSessionContext(sessionId) {
    const session = await chatStore.get(sessionId);

    if (!session) {
      throw new AppError("Chat session not found", HTTP_STATUS.NOT_FOUND);
    }

    return {
      conversationId: session.conversationId || session.context?.conversationId || "",
      sessionId: session.sessionId,
      context: session.context,
      turns: session.history.length,
    };
  },

  async getSessionHistory(sessionId, query = {}) {
    const session = await chatStore.get(sessionId);

    if (!session) {
      throw new AppError("Chat session not found", HTTP_STATUS.NOT_FOUND);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const start = (page - 1) * limit;
    const items = session.history.slice(start, start + limit);

    return {
      sessionId: session.sessionId,
      conversationId: session.conversationId || session.context?.conversationId || "",
      items,
      total: session.history.length,
      page,
      limit,
      hasMore: start + items.length < session.history.length,
    };
  },

  async handleMessage(payload) {
    if (!payload.message || !String(payload.message).trim()) {
      throw new AppError("message is required", HTTP_STATUS.BAD_REQUEST);
    }

    let session = payload.sessionId ? await chatStore.get(payload.sessionId) : null;
    const conversation = await resolveConversation(payload, session);

    if (!session) {
      session = await chatStore.create({
        ...payload,
        conversationId: conversation.conversationId,
        patientName: payload.patientName || conversation.patientName,
        disease: payload.disease || conversation.disease,
        location: payload.location || conversation.location,
        intent: payload.intent || conversation.intent,
      });
    }
    const resolvedContext = resolveContext(session, payload);

    if (!resolvedContext.disease && resolvedContext.isFollowUp) {
      throw new AppError(
        "A follow-up question needs disease context. Please include the condition you want to discuss.",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const expandedQuery = queryExpansionService.expand({
      disease: resolvedContext.disease,
      intent: resolvedContext.intent,
      location: resolvedContext.location,
      query: resolvedContext.message,
      topic: resolvedContext.topic,
    });

    const retrievalResult = await retrievalService.retrieve(expandedQuery, resolvedContext);
    const rankedEvidence = rankingService.rank(retrievalResult, resolvedContext);
    const answer = await reasoningService.composeAnswer({
      context: resolvedContext,
      evidence: rankedEvidence,
    });
    const rendered = await renderWithPython({
      context: resolvedContext,
      answer: answer.answer,
      sources: answer.sources,
      safety: answer.safety,
    });

    session.context = {
      ...session.context,
      conversationId: conversation.conversationId,
      patientName: resolvedContext.patientName,
      disease: resolvedContext.disease,
      location: resolvedContext.location,
      lastIntent: resolvedContext.intent,
      lastQuery: resolvedContext.message,
      lastTopic: answer.answer.conditionOverview,
    };
    const newTurns = [
      {
        role: "user",
        message: resolvedContext.message,
        at: new Date().toISOString(),
      },
      {
        role: "assistant",
        message: answer.answer.summary,
        at: new Date().toISOString(),
      },
    ];
    session.history = [...session.history, ...newTurns];
    session.conversationId = conversation.conversationId;
    session = await chatStore.save(session, newTurns);
    await conversationService.syncFromSession({
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      context: session.context,
      history: session.history,
      summary: answer.answer.summary,
    });

    return {
      status: "completed",
      progress: buildProgressState(rankedEvidence),
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      resolvedContext,
      retrievalMeta: rankedEvidence.meta,
      answer: answer.answer,
      rendered,
      sources: answer.sources,
      suggestedActions: buildSuggestedActions(answer, rendered),
      safety: answer.safety,
    };
  },

  async summarizeSession(payload = {}) {
    const session = await resolveSessionFromPayload(payload);
    const conversation = await resolveConversation(payload, session);
    const latestAssistant = getLatestTurn(session.history, "assistant");

    return {
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      summary: conversation.summary || latestAssistant?.message || "No session summary available yet.",
      title: conversation.title,
      turnsCount: session.history.length,
    };
  },

  async exportProtocol(payload = {}) {
    const session = await resolveSessionFromPayload(payload);
    const conversation = await resolveConversation(payload, session);
    const latestAssistant = getLatestTurn(session.history, "assistant");
    const latestUser = getLatestTurn(session.history, "user");

    return {
      conversationId: conversation.conversationId,
      sessionId: session.sessionId,
      protocol: {
        title: `Protocol draft for ${conversation.disease || "research topic"}`,
        objective: latestUser?.message || conversation.title,
        clinicalContext: {
          patientName: conversation.patientName,
          disease: conversation.disease,
          location: conversation.location,
        },
        synthesisSummary: latestAssistant?.message || conversation.summary,
        nextActions: [
          "Validate the selected evidence set with the research team.",
          "Confirm inclusion and exclusion criteria before drafting conclusions.",
          "Attach citations and export the protocol package.",
        ],
      },
    };
  },

  async previewCitation(payload = {}) {
    const sources = Array.isArray(payload.sources) ? payload.sources : [];
    const session = payload.sessionId ? await resolveSessionFromPayload(payload) : null;

    return {
      conversationId: payload.conversationId || session?.conversationId || session?.context?.conversationId || "",
      sessionId: payload.sessionId || session?.sessionId || "",
      citations: sources.slice(0, 8).map((source) => ({
        id: source.id || source.sourceId || "",
        title: source.title || "Untitled source",
        platform: source.platform || source.source || "Unknown",
        year: source.year || source.publicationYear || null,
        url: source.url || "",
        preview: `${source.title || "Untitled source"}${source.year ? ` (${source.year})` : ""}${source.platform ? ` - ${source.platform}` : ""}`,
      })),
    };
  },
};

async function renderWithPython(payload) {
  try {
    return await pythonRenderer.renderResearchAnswer(payload);
  } catch (error) {
    return {
      status: "error",
      message: error.message,
    };
  }
}

async function resolveSessionFromPayload(payload) {
  if (!payload.sessionId) {
    throw new AppError("sessionId is required", HTTP_STATUS.BAD_REQUEST);
  }

  const session = await chatStore.get(payload.sessionId);
  if (!session) {
    throw new AppError("Chat session not found", HTTP_STATUS.NOT_FOUND);
  }

  return session;
}

async function resolveConversation(payload, session) {
  if (payload?.conversationId) {
    return conversationService.ensureConversation(payload);
  }

  if (session?.conversationId || session?.context?.conversationId) {
    return conversationService.getConversation(session.conversationId || session.context.conversationId);
  }

  return conversationService.ensureConversation(payload || {});
}

function getLatestTurn(history = [], role) {
  return [...history].reverse().find((item) => item.role === role) || null;
}

function buildProgressState(rankedEvidence) {
  return {
    current: "completed",
    steps: [
      { id: "retrieve", label: "Retrieved evidence", done: true },
      { id: "rank", label: "Ranked evidence", done: true },
      { id: "reason", label: "Synthesized answer", done: true },
    ],
    totals: rankedEvidence.meta?.totals || {},
  };
}

function buildSuggestedActions(answer, rendered) {
  return [
    {
      id: "summarize",
      label: "Summarize Findings",
      endpoint: "/api/v1/chat/actions/summarize",
      enabled: true,
    },
    {
      id: "export-protocol",
      label: "Export to Protocol",
      endpoint: "/api/v1/chat/actions/export-protocol",
      enabled: true,
    },
    {
      id: "citation-preview",
      label: "Share Citation",
      endpoint: "/api/v1/chat/actions/citation-preview",
      enabled: true,
    },
    {
      id: "rendered-view",
      label: "Rendered View Ready",
      endpoint: "/api/v1/rendering/research-answer",
      enabled: rendered?.status === "ok" && Boolean(answer?.summary),
    },
  ];
}

module.exports = { chatService };
