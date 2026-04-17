const { HTTP_STATUS } = require("../../constants/httpStatus");
const { dashboardService } = require("./dashboard.service");

async function getDashboardOverview(req, res) {
  res.status(HTTP_STATUS.OK).json(await dashboardService.getOverview());
}

module.exports = { getDashboardOverview };
