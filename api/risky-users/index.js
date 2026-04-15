const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await graphRequest('/identityProtection/riskyUsers?$top=50&$orderby=riskLastUpdatedDateTime desc');
    const users = (data.value || []).map(u => ({
      id: u.id,
      userPrincipalName: u.userPrincipalName,
      userDisplayName: u.userDisplayName,
      riskLevel: u.riskLevel,
      riskState: u.riskState,
      riskDetail: u.riskDetail,
      riskLastUpdatedDateTime: u.riskLastUpdatedDateTime,
      isProcessing: u.isProcessing,
      isDeleted: u.isDeleted
    }));

    const summary = {
      total: users.length,
      high: users.filter(u => u.riskLevel === 'high').length,
      medium: users.filter(u => u.riskLevel === 'medium').length,
      low: users.filter(u => u.riskLevel === 'low').length,
      atRisk: users.filter(u => u.riskState === 'atRisk').length,
      confirmedCompromised: users.filter(u => u.riskState === 'confirmedCompromised').length,
      remediated: users.filter(u => u.riskState === 'remediated').length
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, riskyUsers: users } };
  } catch (error) {
    let hint = 'Requires IdentityRiskyUser.Read.All and Azure AD Premium P2 license.';
    if (error.message.includes('403')) hint = 'Permission denied or Azure AD Premium P2 not licensed.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
