const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const userId = req.body && req.body.userId;
    if (!userId) {
      context.res = { status: 400, body: { error: 'userId is required' } };
      return;
    }
    await graphRequest(`/users/${encodeURIComponent(userId)}`, 'PATCH', { accountEnabled: false });
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { success: true, action: 'disabled', userId } };
  } catch (error) {
    const msg = error.message || '';
    let hint = 'Requires User.ReadWrite.All permission with admin consent.';
    if (msg.includes('403')) hint = 'Permission denied. Grant User.ReadWrite.All (Application) and admin consent.';
    if (msg.includes('404')) hint = 'User not found.';
    context.res = { status: 500, body: { error: msg, hint } };
  }
};
