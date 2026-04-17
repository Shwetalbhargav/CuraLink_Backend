const express = require("express");

const { env } = require("./config/env");
const { notFoundHandler } = require("./middlewares/notFoundHandler");
const { errorHandler } = require("./middlewares/errorHandler");
const { registerRoutes } = require("./routes");

function buildAllowedOrigins() {
  const origins = [env.clientOrigin, env.clientOrigins]
    .flatMap((value) => String(value || "").split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : ["*"];
}

function resolveCorsOrigin(requestOrigin, allowedOrigins) {
  if (!requestOrigin) {
    return allowedOrigins[0] === "*" ? "*" : allowedOrigins[0];
  }

  if (allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    const corsOrigin = resolveCorsOrigin(requestOrigin, allowedOrigins);

    if (corsOrigin) {
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      return corsOrigin ? res.sendStatus(204) : res.sendStatus(403);
    }

    next();
  });

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
