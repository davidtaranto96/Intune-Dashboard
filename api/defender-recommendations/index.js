const { mdeRequest, graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  // Try MDE API first (Machine.Read.All on WindowsDefenderATP)
  try {
    const data = await mdeRequest('/recommendations?$top=50&$orderby=severityScore desc');
    const recs = (data.value || []).map(r => ({
      id: r.id,
      productName: r.productName,
      recommendationName: r.recommendationName,
      weaknesses: r.weaknesses,
      vendor: r.vendor,
      recommendedProgram: r.recommendedProgram,
      recommendedVersion: r.recommendedVersion,
      severityScore: r.severityScore,
      remediationUrgencyScore: r.remediationUrgencyScore,
      publicExploit: r.publicExploit,
      activeAlert: r.activeAlert,
      exposedMachinesCount: r.exposedMachinesCount,
      relatedComponent: r.relatedComponent,
      status: r.status,
      source: 'mde'
    }));

    const summary = {
      total: recs.length,
      critical: recs.filter(r => r.severityScore >= 7).length,
      withActiveAlert: recs.filter(r => r.activeAlert).length,
      withExploit: recs.filter(r => r.publicExploit).length,
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, recommendations: recs, source: 'mde' } };
    return;
  } catch (mdeError) { /* fallback */ }

  // Fallback: Graph API secure score control profiles
  try {
    const data = await graphRequest('/security/secureScoreControlProfiles?$top=50');
    const recs = (data.value || [])
      .filter(r => r.implementationStatus !== 'implemented')
      .sort((a, b) => (b.maxScore || 0) - (a.maxScore || 0))
      .map(r => ({
        id: r.id,
        productName: r.controlCategory || 'Microsoft 365',
        recommendationName: r.title,
        weaknesses: 0,
        severityScore: r.maxScore || 0,
        remediationUrgencyScore: r.maxScore || 0,
        publicExploit: false,
        activeAlert: false,
        exposedMachinesCount: 0,
        relatedComponent: r.controlCategory,
        status: r.implementationStatus,
        remediation: r.remediation,
        source: 'graph'
      }));

    const summary = {
      total: recs.length,
      critical: recs.filter(r => r.severityScore >= 5).length,
      withActiveAlert: 0,
      withExploit: 0,
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, recommendations: recs, source: 'graph' } };
  } catch (error) {
    context.res = { status: 500, body: { error: error.message, hint: 'Requires Machine.Read.All (MDE) or SecurityEvents.Read.All (Graph).' } };
  }
};
