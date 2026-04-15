const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const userId = req.body && req.body.userId;
    if (!userId) {
      context.res = { status: 400, body: { error: 'userId is required' } };
      return;
    }
    // Identity Protection requires the actual user GUID, not UPN
    // If userId looks like a UPN (contains @), resolve to GUID first
    let userGuid = userId;
    if (userId.includes('@')) {
      const user = await graphRequest(`/users/${encodeURIComponent(userId)}?$select=id`);
      userGuid = user.id;
    }
    await graphRequest('/identityProtection/riskyUsers/confirmCompromised', 'POST', { userIds: [userGuid] });
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { success: true, action: 'confirmed_compromised', userId: userGuid } };
  } catch (error) {
    let hint = 'Requires IdentityRiskyUser.ReadWrite.All permission and Azure AD Premium P2.';
    if (error.message.includes('403')) hint = 'Permission denied or Azure AD Premium P2 not licensed.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
