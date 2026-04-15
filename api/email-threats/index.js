const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    // Email threats from Defender for Office 365
    const data = await graphRequest(
      "/security/alerts_v2?$top=100&$orderby=createdDateTime desc&$filter=serviceSource eq 'microsoftDefenderForOffice365'"
    );
    const alerts = (data.value || []).map(a => {
      // Extract email evidence
      const emailEvidence = (a.evidence || []).filter(e =>
        e['@odata.type'] === '#microsoft.graph.security.mailboxEvidence' ||
        e['@odata.type'] === '#microsoft.graph.security.userEvidence'
      );
      const recipients = emailEvidence
        .map(e => e.userAccount ? (e.userAccount.userPrincipalName || e.userAccount.displayName) : null)
        .filter(Boolean);

      // Determine threat type from category
      const cat = (a.category || '').toLowerCase();
      const threatType =
        cat.includes('phish') ? 'phishing' :
        cat.includes('malware') || cat.includes('virus') ? 'malware' :
        cat.includes('spam') ? 'spam' :
        cat.includes('ransomware') ? 'ransomware' : 'threat';

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        severity: a.severity,
        status: a.status,
        category: a.category,
        threatType,
        createdDateTime: a.createdDateTime,
        lastUpdateDateTime: a.lastUpdateDateTime,
        alertWebUrl: a.alertWebUrl,
        incidentWebUrl: a.incidentWebUrl,
        recipients,
      };
    });

    // Top targeted users
    const userCounts = {};
    alerts.forEach(a => {
      a.recipients.forEach(r => {
        userCounts[r] = (userCounts[r] || 0) + 1;
      });
    });
    const topTargeted = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([upn, count]) => ({ upn, count }));

    const summary = {
      total: alerts.length,
      phishing: alerts.filter(a => a.threatType === 'phishing').length,
      malware:  alerts.filter(a => a.threatType === 'malware').length,
      spam:     alerts.filter(a => a.threatType === 'spam').length,
      high:     alerts.filter(a => a.severity === 'high').length,
      newAlerts: alerts.filter(a => a.status === 'new').length,
      usersTargeted: Object.keys(userCounts).length,
    };

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { summary, alerts, topTargeted }
    };
  } catch (error) {
    let hint = 'Requires SecurityAlert.Read.All (Application) and Microsoft Defender for Office 365 license.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant SecurityAlert.Read.All with admin consent.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
