const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const userId = req.body && req.body.userId;
    if (!userId) {
      context.res = { status: 400, body: { error: 'userId is required' } };
      return;
    }
    let userGuid = userId;
    if (userId.includes('@')) {
      const user = await graphRequest(`/users/${encodeURIComponent(userId)}?$select=id`);
      userGuid = user.id;
    }
    await graphRequest('/identityProtection/riskyUsers/dismiss', 'POST', { userIds: [userGuid] });
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { success: true, action: 'risk_dismissed', userId: userGuid } };
  } catch (error) {
    context.res = { status: 500, body: { error: error.message, hint: 'Requires IdentityRiskyUser.ReadWrite.All and Azure AD Premium P2.' } };
  }
};
