const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createSession,
  getSessionContext,
  getSessionHistory,
  summarizeSession,
  exportProtocol,
  previewCitation,
  sendMessage,
} = require("./chat.controller");

const chatRouter = Router();

chatRouter.post("/session", asyncHandler(createSession));
chatRouter.get("/session/:sessionId/context", asyncHandler(getSessionContext));
chatRouter.get("/session/:sessionId/history", asyncHandler(getSessionHistory));
chatRouter.post("/message", asyncHandler(sendMessage));
chatRouter.post("/actions/summarize", asyncHandler(summarizeSession));
chatRouter.post("/actions/export-protocol", asyncHandler(exportProtocol));
chatRouter.post("/actions/citation-preview", asyncHandler(previewCitation));

module.exports = { chatRouter };
