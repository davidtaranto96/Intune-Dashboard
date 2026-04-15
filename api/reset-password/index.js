const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const userId = req.body && req.body.userId;
    if (!userId) {
      context.res = { status: 400, body: { error: 'userId is required' } };
      return;
    }
    await graphRequest(`/users/${encodeURIComponent(userId)}`, 'PATCH', {
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        forceChangePasswordNextSignInWithMfa: true
      }
    });
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { success: true, action: 'password_reset_forced', userId } };
  } catch (error) {
    let hint = 'Requires User.ReadWrite.All permission.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant User.ReadWrite.All (Application) and admin consent.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
