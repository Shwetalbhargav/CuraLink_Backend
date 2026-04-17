const { renderingService } = require("../rendering/rendering.service");

const exportService = {
  describeModule() {
    return {
      module: "exports",
      capabilities: [
        "report-export",
        "protocol-export",
        "library-csv-export",
      ],
      endpoints: {
        report: "/api/v1/exports/report",
        protocol: "/api/v1/exports/protocol",
        libraryCsv: "/api/v1/exports/library-csv",
      },
    };
  },

  async exportReport(payload = {}) {
    const rendered = await renderingService.renderResearchAnswer({
      ...payload,
      format: payload.format || "markdown",
      template: payload.template || "export",
    });

    return {
      exportType: "report",
      generatedAt: new Date().toISOString(),
      content: rendered,
    };
  },

  exportProtocol(payload = {}) {
    return {
      exportType: "protocol",
      generatedAt: new Date().toISOString(),
      protocol: {
        title: payload.title || "Research protocol export",
        objective: payload.objective || "",
        summary: payload.summary || "",
        sections: Array.isArray(payload.sections) ? payload.sections : [],
      },
    };
  },

  exportLibraryCsv(payload = {}) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const lines = [
      "id,title,type,source,status,url",
      ...items.map((item) =>
        [
          safeCsv(item.id || item.itemId),
          safeCsv(item.title),
          safeCsv(item.type),
          safeCsv(item.source),
          safeCsv(item.status),
          safeCsv(item.url),
        ].join(",")
      ),
    ];

    return {
      exportType: "library-csv",
      generatedAt: new Date().toISOString(),
      csv: lines.join("\n"),
    };
  },
};

function safeCsv(value) {
  const normalized = String(value || "").replace(/"/g, '""');
  return `"${normalized}"`;
}

module.exports = { exportService };
