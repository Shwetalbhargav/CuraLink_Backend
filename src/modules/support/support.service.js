const supportRequests = [];

const supportService = {
  describeModule() {
    return {
      module: "support",
      capabilities: [
        "faqs",
        "support-requests",
        "service-status",
      ],
      endpoints: {
        faqs: "/api/v1/support/faqs",
        requests: "/api/v1/support/requests",
        status: "/api/v1/support/status",
      },
    };
  },

  listFaqs() {
    return {
      items: [
        {
          id: "faq-export",
          question: "How do I export my clinical findings?",
          answer: "Use the exports endpoints to generate a report, protocol draft, or library CSV.",
        },
        {
          id: "faq-chat",
          question: "How do follow-up questions keep context?",
          answer: "Chat sessions are linked to conversations and reuse saved disease and topic context.",
        },
        {
          id: "faq-library",
          question: "Can I save sources for later review?",
          answer: "Yes. Save publications, trials, or synthesis outputs to the library module.",
        },
      ],
    };
  },

  createRequest(payload = {}) {
    const request = {
      requestId: `support-${supportRequests.length + 1}`,
      name: String(payload.name || "").trim(),
      email: String(payload.email || "").trim(),
      message: String(payload.message || "").trim(),
      category: String(payload.category || "general").trim(),
      createdAt: new Date().toISOString(),
    };
    supportRequests.push(request);
    return request;
  },

  getStatus() {
    return {
      serviceHealth: "operational",
      api: "ok",
      analysisPipeline: "ok",
      responseTimeMs: 150,
    };
  },
};

module.exports = { supportService };
