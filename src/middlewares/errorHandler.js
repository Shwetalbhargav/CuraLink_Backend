const { HTTP_STATUS } = require("../constants/httpStatus");

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
}

module.exports = { errorHandler };
