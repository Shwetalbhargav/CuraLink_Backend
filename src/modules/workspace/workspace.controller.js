const { HTTP_STATUS } = require("../../constants/httpStatus");
const { workspaceService } = require("./workspace.service");

function getWorkspaceOverview(req, res) {
  res.status(HTTP_STATUS.OK).json(workspaceService.getOverview());
}

function getWorkspaceActivity(req, res) {
  res.status(HTTP_STATUS.OK).json(workspaceService.getActivity());
}

function listWorkspaceProjects(req, res) {
  res.status(HTTP_STATUS.OK).json(workspaceService.listProjects());
}

function createWorkspaceProject(req, res) {
  res.status(HTTP_STATUS.CREATED).json(workspaceService.createProject(req.body || {}));
}

module.exports = {
  getWorkspaceOverview,
  getWorkspaceActivity,
  listWorkspaceProjects,
  createWorkspaceProject,
};
