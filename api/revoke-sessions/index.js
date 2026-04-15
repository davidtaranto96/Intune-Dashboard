const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const userId = req.body && req.body.userId;
    if (!userId) {
      context.res = { status: 400, body: { error: 'userId is required' } };
      return;
    }
    await graphRequest(`/users/${encodeURIComponent(userId)}/revokeSignInSessions`, 'POST');
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { success: true, action: 'sessions_revoked', userId } };
  } catch (error) {
    context.res = { status: 500, body: { error: error.message, hint: 'Requires User.ReadWrite.All or Directory.ReadWrite.All permission.' } };
  }
};
