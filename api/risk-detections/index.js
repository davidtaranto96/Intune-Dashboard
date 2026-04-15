const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const isoSince = since.toISOString().split('.')[0] + 'Z';

    const data = await graphRequest(`/identityProtection/riskDetections?$top=100&$orderby=detectedDateTime desc&$filter=detectedDateTime ge ${isoSince}`);
    const detections = (data.value || []).map(d => ({
      id: d.id,
      userPrincipalName: d.userPrincipalName,
      userDisplayName: d.userDisplayName,
      userId: d.userId,
      riskEventType: d.riskEventType,
      riskLevel: d.riskLevel,
      riskState: d.riskState,
      detectedDateTime: d.detectedDateTime,
      ipAddress: d.ipAddress,
      location: d.location ? { city: d.location.city, state: d.location.state, countryOrRegion: d.location.countryOrRegion } : null,
      activity: d.activity,
      source: d.source,
      tokenIssuerType: d.tokenIssuerType
    }));

    // Summary by type and level
    const byType = {};
    const byLevel = { high: 0, medium: 0, low: 0, hidden: 0 };
    detections.forEach(d => {
      byType[d.riskEventType] = (byType[d.riskEventType] || 0) + 1;
      if (byLevel[d.riskLevel] !== undefined) byLevel[d.riskLevel]++;
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { summary: { total: detections.length, byType, byLevel }, detections }
    };
  } catch (error) {
    let hint = 'Requires IdentityRiskEvent.Read.All and Azure AD Premium P2.';
    if (error.message.includes('403')) hint = 'Permission denied or Azure AD Premium P2 not licensed.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
