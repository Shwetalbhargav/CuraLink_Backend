const { Router } = require("express");

const { listSupportFaqs, createSupportRequest, getSupportStatus } = require("./support.controller");

const supportRouter = Router();

supportRouter.get("/faqs", listSupportFaqs);
supportRouter.post("/requests", createSupportRequest);
supportRouter.get("/status", getSupportStatus);

module.exports = { supportRouter };
