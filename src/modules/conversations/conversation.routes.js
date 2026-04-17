const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createConversation,
  getConversation,
  listConversations,
  listConversationModules,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
} = require("./conversation.controller");

const conversationRouter = Router();

conversationRouter.get("/", asyncHandler(listConversations));
conversationRouter.get("/meta", asyncHandler(listConversationModules));
conversationRouter.get("/:conversationId", asyncHandler(getConversation));
conversationRouter.post("/", asyncHandler(createConversation));
conversationRouter.patch("/:conversationId", asyncHandler(updateConversation));
conversationRouter.patch("/:conversationId/archive", asyncHandler(archiveConversation));
conversationRouter.patch("/:conversationId/unarchive", asyncHandler(unarchiveConversation));

module.exports = { conversationRouter };
