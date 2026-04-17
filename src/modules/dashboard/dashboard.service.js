const { conversationService } = require("../conversations/conversation.service");
const { libraryService } = require("../library/library.service");
const { datasetService } = require("../datasets/dataset.service");

const dashboardService = {
  describeModule() {
    return {
      module: "dashboard",
      endpoint: "/api/v1/dashboard/overview",
      capabilities: [
        "overview-cards",
        "recent-queries",
        "lightweight-trending",
      ],
    };
  },

  async getOverview() {
    const conversations = await conversationService.listConversations({ page: 1, limit: 5 });
    const library = libraryService.listItems({ page: 1, limit: 5 });
    const datasets = datasetService.listDatasets();

    return {
      summary: {
        conversations: conversations.total || 0,
        libraryItems: library.total || 0,
        datasets: datasets.items.length,
      },
      recentQueries: (conversations.items || []).map((item) => ({
        conversationId: item.conversationId,
        title: item.title,
        disease: item.disease,
        updatedAt: item.updatedAt,
      })),
      activeProjects: (datasets.items || []).slice(0, 4).map((item) => ({
        datasetId: item.datasetId,
        name: item.name,
        status: item.status,
      })),
      trending: buildTrendingTopics(conversations.items || []),
    };
  },
};

function buildTrendingTopics(conversations) {
  const counts = new Map();

  for (const item of conversations) {
    const key = item.disease || item.title || "general research";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

module.exports = { dashboardService };
