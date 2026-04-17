const { Router } = require("express");

const { asyncHandler } = require("../../utils/asyncHandler");
const { listPublicationModule, searchPublications } = require("./publication.controller");

const publicationRouter = Router();

publicationRouter.get("/", asyncHandler(listPublicationModule));
publicationRouter.post("/search", asyncHandler(searchPublications));

module.exports = { publicationRouter };
