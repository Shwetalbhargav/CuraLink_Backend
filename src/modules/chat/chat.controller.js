const { chatService } = require("./chat.service");
const { HTTP_STATUS } = require("../../constants/httpStatus");

async function createSession(req, res) {
  const session = await chatService.createSession(req.body || {});
  res.status(HTTP_STATUS.CREATED).json(session);
}

async function getSessionContext(req, res) {
  const context = await chatService.getSessionContext(req.params.sessionId);
  res.status(HTTP_STATUS.OK).json(context);
}

async function getSessionHistory(req, res) {
  const history = await chatService.getSessionHistory(req.params.sessionId, req.query || {});
  res.status(HTTP_STATUS.OK).json(history);
}

async function sendMessage(req, res) {
  const response = await chatService.handleMessage(req.body || {});
  res.status(HTTP_STATUS.OK).json(response);
}

async function summarizeSession(req, res) {
  const response = await chatService.summarizeSession(req.body || {});
  res.status(HTTP_STATUS.OK).json(response);
}

async function exportProtocol(req, res) {
  const response = await chatService.exportProtocol(req.body || {});
  res.status(HTTP_STATUS.OK).json(response);
}

async function previewCitation(req, res) {
  const response = await chatService.previewCitation(req.body || {});
  res.status(HTTP_STATUS.OK).json(response);
}

module.exports = {
  createSession,
  getSessionContext,
  getSessionHistory,
  summarizeSession,
  exportProtocol,
  previewCitation,
  sendMessage,
};
