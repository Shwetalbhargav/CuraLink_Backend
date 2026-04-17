const { createApp } = require("./app");
const { env, validateEnv } = require("./config/env");
const { connectToDatabase } = require("./config/database");
const { logger } = require("./config/logger");

async function bootstrap() {
  const envValidation = validateEnv();

  if (!envValidation.ok) {
    logger.error("Environment validation failed", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length) {
    logger.warn("Environment validation warnings", envValidation.warnings);
  }

  await connectToDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
