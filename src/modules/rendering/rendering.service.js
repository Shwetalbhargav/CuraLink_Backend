const { AppError } = require("../../utils/appError");
const { HTTP_STATUS } = require("../../constants/httpStatus");
const { pythonRenderer } = require("../../services/python/pythonRenderer");

const renderingService = {
  describeModule() {
    return {
      module: "python-rendering",
      provider: "python-bridge",
      endpoint: "/api/v1/rendering/research-answer",
      capabilities: [
        "structured-json-rendering",
        "markdown-rendering",
        "source-card-formatting",
      ],
      formats: ["json", "markdown", "ui-sections"],
      templates: ["default", "deep-synthesis", "chat-card", "export"],
    };
  },

  async renderResearchAnswer(payload = {}) {
    if (!payload.answer) {
      throw new AppError("answer payload is required for rendering", HTTP_STATUS.BAD_REQUEST);
    }

    const rendered = await pythonRenderer.renderResearchAnswer(payload);
    return adaptRenderedPayload(rendered, payload);
  },
};

function adaptRenderedPayload(rendered, payload) {
  const format = String(payload.format || "json").toLowerCase();
  const template = String(payload.template || "default").toLowerCase();

  if (format === "markdown") {
    return {
      status: rendered.status,
      format,
      template,
      headline: rendered.rendering?.headline || "",
      markdown: rendered.rendering?.markdown || "",
      exportBlocks: buildExportBlocks(rendered),
    };
  }

  if (format === "ui-sections") {
    return {
      status: rendered.status,
      format,
      template,
      headline: rendered.rendering?.headline || "",
      sections: rendered.rendering?.sections || [],
      sourceCards: rendered.rendering?.sourceCards || [],
      exportBlocks: buildExportBlocks(rendered),
    };
  }

  return {
    ...rendered,
    format,
    template,
    exportBlocks: buildExportBlocks(rendered),
  };
}

function buildExportBlocks(rendered) {
  return {
    headline: rendered.rendering?.headline || "",
    summary: rendered.rendering?.sections?.find((item) => item.id === "summary")?.content || "",
    markdown: rendered.rendering?.markdown || "",
    sources: rendered.rendering?.sourceCards || [],
  };
}

module.exports = { renderingService };
