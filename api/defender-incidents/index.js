const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await graphRequest('/security/incidents?$top=50&$orderby=createdDateTime desc');
    const incidents = (data.value || []).map(i => ({
      id: i.id,
      displayName: i.displayName,
      severity: i.severity,
      status: i.status,
      classification: i.classification,
      determination: i.determination,
      assignedTo: i.assignedTo,
      createdDateTime: i.createdDateTime,
      lastUpdateDateTime: i.lastUpdateDateTime,
      incidentWebUrl: i.incidentWebUrl,
      alertCount: (i.alerts || []).length,
      alerts: (i.alerts || []).slice(0, 5).map(a => ({
        id: a.id, title: a.title, severity: a.severity, status: a.status,
        serviceSource: a.serviceSource, createdDateTime: a.createdDateTime,
        deviceDnsName: a.evidence ? (a.evidence.find(e => e.deviceDnsName) || {}).deviceDnsName : null
      })),
      devicesCount: (i.alerts || []).reduce((acc, a) => {
        const devs = (a.evidence || []).filter(e => e['@odata.type'] === '#microsoft.graph.security.deviceEvidence').map(e => e.deviceDnsName).filter(Boolean);
        devs.forEach(d => acc.add(d));
        return acc;
      }, new Set()).size
    }));

    const summary = {
      total: incidents.length,
      active: incidents.filter(i => i.status === 'active' || i.status === 'inProgress').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, incidents } };
  } catch (error) {
    let hint = 'Requires SecurityIncident.Read.All (Application) permission with admin consent.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant SecurityIncident.Read.All and give admin consent.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
