const { HTTP_STATUS } = require("../constants/httpStatus");

function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { notFoundHandler };
