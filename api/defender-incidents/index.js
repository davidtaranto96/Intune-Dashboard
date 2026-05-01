const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await graphRequest('/security/incidents?$top=50&$orderby=createdDateTime desc&$expand=alerts($expand=evidence)');
    const incidents = (data.value || []).map(i => {
      const alertList = (i.alerts || []);
      // Collect unique affected devices across all alerts
      const deviceSet = new Set();
      alertList.forEach(a => {
        (a.evidence || [])
          .filter(e => e['@odata.type'] === '#microsoft.graph.security.deviceEvidence')
          .forEach(e => { if (e.deviceDnsName) deviceSet.add(e.deviceDnsName); });
      });
      return {
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
        alertCount: alertList.length,
        devicesCount: deviceSet.size,
        affectedDevices: Array.from(deviceSet).slice(0, 5),
        alerts: alertList.slice(0, 8).map(a => {
          const devEvidence = (a.evidence || []).find(e =>
            e['@odata.type'] === '#microsoft.graph.security.deviceEvidence'
          );
          return {
            id: a.id,
            title: a.title,
            description: a.description ? a.description.substring(0, 200) : '',
            severity: a.severity,
            status: a.status,
            serviceSource: a.serviceSource,
            createdDateTime: a.createdDateTime,
            deviceDnsName: devEvidence ? devEvidence.deviceDnsName : null,
            alertWebUrl: a.alertWebUrl
          };
        })
      };
    });

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
