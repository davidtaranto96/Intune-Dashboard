const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const deviceId = req.query.deviceId;

    if (!deviceId) {
      context.res = {
        status: 400,
        body: { error: 'Missing required parameter: deviceId' }
      };
      return;
    }

    // Trigger a sync on the device
    await graphRequest(
      `/deviceManagement/managedDevices/${deviceId}/syncDevice`,
      'POST'
    );

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        success: true,
        message: `Sync triggered for device ${deviceId}`,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
