const { Router } = require("express");

const {
  getWorkspaceOverview,
  getWorkspaceActivity,
  listWorkspaceProjects,
  createWorkspaceProject,
} = require("./workspace.controller");

const workspaceRouter = Router();

workspaceRouter.get("/", getWorkspaceOverview);
workspaceRouter.get("/activity", getWorkspaceActivity);
workspaceRouter.get("/projects", listWorkspaceProjects);
workspaceRouter.post("/projects", createWorkspaceProject);

module.exports = { workspaceRouter };
