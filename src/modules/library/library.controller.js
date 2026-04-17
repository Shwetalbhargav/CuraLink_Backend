const { HTTP_STATUS } = require("../../constants/httpStatus");
const { libraryService } = require("./library.service");

function listLibraryItems(req, res) {
  res.status(HTTP_STATUS.OK).json(libraryService.listItems(req.query || {}));
}

function createLibraryItem(req, res) {
  res.status(HTTP_STATUS.CREATED).json(libraryService.createItem(req.body || {}));
}

function updateLibraryItem(req, res) {
  res.status(HTTP_STATUS.OK).json(libraryService.updateItem(req.params.itemId, req.body || {}));
}

function deleteLibraryItem(req, res) {
  res.status(HTTP_STATUS.OK).json(libraryService.deleteItem(req.params.itemId));
}

function listLibraryFolders(req, res) {
  res.status(HTTP_STATUS.OK).json(libraryService.listFolders());
}

function createLibraryFolder(req, res) {
  res.status(HTTP_STATUS.CREATED).json(libraryService.createFolder(req.body || {}));
}

module.exports = {
  listLibraryItems,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  listLibraryFolders,
  createLibraryFolder,
};
