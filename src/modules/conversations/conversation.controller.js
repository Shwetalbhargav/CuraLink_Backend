const { conversationService } = require("./conversation.service");
const { HTTP_STATUS } = require("../../constants/httpStatus");

async function createConversation(req, res) {
  const conversation = await conversationService.createConversation(req.body);
  res.status(HTTP_STATUS.CREATED).json(conversation);
}

async function getConversation(req, res) {
  const conversation = await conversationService.getConversation(req.params.conversationId);
  res.status(HTTP_STATUS.OK).json(conversation);
}

async function updateConversation(req, res) {
  const conversation = await conversationService.updateConversation(req.params.conversationId, req.body || {});
  res.status(HTTP_STATUS.OK).json(conversation);
}

async function archiveConversation(req, res) {
  const conversation = await conversationService.archiveConversation(req.params.conversationId);
  res.status(HTTP_STATUS.OK).json(conversation);
}

async function unarchiveConversation(req, res) {
  const conversation = await conversationService.unarchiveConversation(req.params.conversationId);
  res.status(HTTP_STATUS.OK).json(conversation);
}

async function listConversationModules(req, res) {
  const modules = await conversationService.listCapabilities();
  res.status(HTTP_STATUS.OK).json(modules);
}

async function listConversations(req, res) {
  const conversations = await conversationService.listConversations(req.query || {});
  res.status(HTTP_STATUS.OK).json(conversations);
}

module.exports = {
  createConversation,
  getConversation,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  listConversationModules,
  listConversations,
};
