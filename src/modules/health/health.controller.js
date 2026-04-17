const { env, validateEnv } = require("../../config/env");
const { HTTP_STATUS } = require("../../constants/httpStatus");

function getHealth(req, res) {
  const validation = validateEnv();

  res.status(HTTP_STATUS.OK).json({
    status: validation.ok ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      mongodbConfigured: Boolean(env.mongoUri),
      pythonConfigured: Boolean(env.pythonExecutable),
    },
    config: {
      valid: validation.ok,
      warningCount: validation.warnings.length,
      errorCount: validation.errors.length,
    },
  });
}

module.exports = { getHealth };
