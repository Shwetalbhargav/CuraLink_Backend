const { Router } = require("express");

const {
  listLibraryItems,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  listLibraryFolders,
  createLibraryFolder,
} = require("./library.controller");

const libraryRouter = Router();

libraryRouter.get("/", listLibraryItems);
libraryRouter.post("/items", createLibraryItem);
libraryRouter.patch("/items/:itemId", updateLibraryItem);
libraryRouter.delete("/items/:itemId", deleteLibraryItem);
libraryRouter.get("/folders", listLibraryFolders);
libraryRouter.post("/folders", createLibraryFolder);

module.exports = { libraryRouter };
