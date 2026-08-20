const asyncHandler = require('../middleware/asyncHandler');
const { getChannelStatus } = require('../services/notifications.service');

const status = asyncHandler(async (req, res) => {
  res.json({ success: true, data: getChannelStatus() });
});

module.exports = { status };
