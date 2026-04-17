const { ChatSession } = require("./chatSession.model");

const chatRepository = {
  async create(session) {
    const document = await ChatSession.create({
      sessionId: session.sessionId,
      conversationId: session.conversationId || "",
      context: session.context,
      history: session.history,
    });

    return mapDocument(document);
  },

  async findBySessionId(sessionId) {
    const document = await ChatSession.findOne({ sessionId }).lean();
    return document ? mapDocument(document) : null;
  },

  async save(session, newTurns = []) {
    const document = await ChatSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      {
        $set: {
          conversationId: session.conversationId || "",
          context: session.context,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(session.createdAt),
        },
        ...(newTurns.length
          ? {
              $push: {
                history: {
                  $each: newTurns.map((turn) => ({
                    ...turn,
                    at: new Date(turn.at),
                  })),
                },
              },
            }
          : {}),
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
    sessionId: document.sessionId,
    conversationId: document.conversationId || document.context?.conversationId || "",
    context: document.context || {},
    history: (document.history || []).map((turn) => ({
      ...turn,
      at: new Date(turn.at).toISOString(),
    })),
    createdAt: new Date(document.createdAt).toISOString(),
    updatedAt: new Date(document.updatedAt).toISOString(),
  };
}

module.exports = { chatRepository };
