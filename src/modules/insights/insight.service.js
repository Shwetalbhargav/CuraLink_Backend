const { conversationService } = require("../conversations/conversation.service");
const { libraryService } = require("../library/library.service");

const insightService = {
  describeModule() {
    return {
      module: "insights",
      capabilities: [
        "overview-signals",
        "topic-summaries",
      ],
      endpoints: {
        overview: "/api/v1/insights/overview",
        signals: "/api/v1/insights/signals",
      },
    };
  },

  async getOverview() {
    const conversations = await conversationService.listConversations({ page: 1, limit: 20 });
    const library = libraryService.listItems({ page: 1, limit: 20 });

    return {
      totals: {
        conversations: conversations.total || 0,
        savedItems: library.total || 0,
      },
      topConditions: summarizeConditions(conversations.items || []),
    };
  },

  async getSignals() {
    const conversations = await conversationService.listConversations({ page: 1, limit: 20 });
    return {
      items: summarizeConditions(conversations.items || []).map((item) => ({
        signal: item.label,
        strength: item.count,
      })),
    };
  },
};

function summarizeConditions(items) {
  const counts = new Map();

  for (const item of items) {
    const key = item.disease || "general";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

module.exports = { insightService };
