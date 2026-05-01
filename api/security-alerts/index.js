const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await graphRequest('/security/alerts_v2?$top=50&$orderby=createdDateTime desc&$expand=evidence');
    const alerts = (data.value || []).map(a => {
      // Extract device info from evidence
      const deviceEvidence = (a.evidence || []).find(e =>
        e['@odata.type'] === '#microsoft.graph.security.deviceEvidence'
      );
      const deviceDnsName = deviceEvidence ? (deviceEvidence.deviceDnsName || deviceEvidence.deviceId || '') : '';
      // Threat family from additionalData or category
      const threatFamilyName = (a.additionalData && a.additionalData.ThreatFamilyName)
        || (a.additionalData && a.additionalData.threatFamilyName)
        || '';
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        severity: a.severity,
        status: a.status,
        category: a.category,
        serviceSource: a.serviceSource || '',
        deviceDnsName,
        threatFamilyName,
        createdDateTime: a.createdDateTime,
        lastUpdateDateTime: a.lastUpdateDateTime,
        alertWebUrl: a.alertWebUrl,
        providerAlertId: a.providerAlertId,
        incidentWebUrl: a.incidentWebUrl
      };
    });

    const summary = {
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      informational: alerts.filter(a => a.severity === 'informational').length,
      new: alerts.filter(a => a.status === 'new').length,
      inProgress: alerts.filter(a => a.status === 'inProgress').length,
      resolved: alerts.filter(a => a.status === 'resolved').length
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, alerts } };
  } catch (error) {
    let hint = 'Requires SecurityAlert.Read.All or SecurityEvents.Read.All permission.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant SecurityAlert.Read.All (Application) with admin consent.';
    // Try fallback to v1 alerts
    try {
      const data = await graphRequest('/security/alerts?$top=50&$orderby=createdDateTime desc');
      const alerts = (data.value || []).map(a => ({
        id: a.id, title: a.title, description: a.description, severity: a.severity,
        status: a.status, category: a.category, createdDateTime: a.createdDateTime
      }));
      context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary: { total: alerts.length }, alerts, fallback: true } };
      return;
    } catch (e) { /* fall through */ }
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
