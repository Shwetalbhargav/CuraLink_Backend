const { randomUUID } = require("crypto");

const workspaceProjects = new Map();
const workspaceActivity = [];

const workspaceService = {
  describeModule() {
    return {
      module: "workspace",
      capabilities: [
        "project-containers",
        "activity-feed",
      ],
      endpoints: {
        overview: "/api/v1/workspace",
        activity: "/api/v1/workspace/activity",
        projects: "/api/v1/workspace/projects",
      },
    };
  },

  getOverview() {
    return {
      projects: [...workspaceProjects.values()],
      activity: workspaceActivity.slice(-10).reverse(),
    };
  },

  getActivity() {
    return {
      items: workspaceActivity.slice(-20).reverse(),
    };
  },

  listProjects() {
    return {
      items: [...workspaceProjects.values()],
    };
  },

  createProject(payload = {}) {
    const project = {
      projectId: randomUUID(),
      name: String(payload.name || "Untitled project").trim(),
      description: String(payload.description || "").trim(),
      status: String(payload.status || "active").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workspaceProjects.set(project.projectId, project);
    workspaceActivity.push({
      id: `activity-${workspaceActivity.length + 1}`,
      type: "project-created",
      label: `Created project ${project.name}`,
      at: new Date().toISOString(),
    });

    return project;
  },
};

module.exports = { workspaceService };
