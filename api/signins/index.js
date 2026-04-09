const { graphRequestAllPages, graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const filter = req.query.filter || '';
    const top = parseInt(req.query.top) || 200;
    const search = req.query.search || '';

    // Build the query - get recent sign-ins
    let endpoint = `/auditLogs/signIns?$top=${Math.min(top, 500)}&$orderby=createdDateTime desc`;

    // Add filters
    const filters = [];
    if (filter === 'blocked') {
      filters.push("status/errorCode ne 0");
    } else if (filter === 'success') {
      filters.push("status/errorCode eq 0");
    } else if (filter === 'ca_failure') {
      filters.push("conditionalAccessStatus eq 'failure'");
    } else if (filter === 'ca_success') {
      filters.push("conditionalAccessStatus eq 'success'");
    } else if (filter === 'mfa_required') {
      filters.push("authenticationRequirement eq 'multiFactorAuthentication'");
    }

    if (search) {
      filters.push(`startswith(userDisplayName,'${search}') or startswith(userPrincipalName,'${search}')`);
    }

    if (filters.length) {
      endpoint += '&$filter=' + filters.join(' and ');
    }

    const data = await graphRequest(endpoint);
    const signIns = data.value || [];

    // Enrich with summaries
    const enriched = signIns.map(s => {
      // CA policies applied
      const caPolicies = (s.appliedConditionalAccessPolicies || []).map(p => ({
        displayName: p.displayName,
        result: p.result,
        enforcedGrantControls: p.enforcedGrantControls || [],
        enforcedSessionControls: p.enforcedSessionControls || []
      }));

      const caBlocked = caPolicies.filter(p => p.result === 'failure');
      const caApplied = caPolicies.filter(p => p.result === 'success');

      return {
        id: s.id,
        createdDateTime: s.createdDateTime,
        userDisplayName: s.userDisplayName,
        userPrincipalName: s.userPrincipalName,
        appDisplayName: s.appDisplayName,
        ipAddress: s.ipAddress,
        clientAppUsed: s.clientAppUsed,
        deviceDetail: {
          displayName: s.deviceDetail?.displayName,
          operatingSystem: s.deviceDetail?.operatingSystem,
          browser: s.deviceDetail?.browser,
          isCompliant: s.deviceDetail?.isCompliant,
          isManaged: s.deviceDetail?.isManaged
        },
        location: {
          city: s.location?.city,
          state: s.location?.state,
          countryOrRegion: s.location?.countryOrRegion
        },
        status: {
          errorCode: s.status?.errorCode || 0,
          failureReason: s.status?.failureReason || '',
          additionalDetails: s.status?.additionalDetails || ''
        },
        conditionalAccessStatus: s.conditionalAccessStatus,
        authenticationRequirement: s.authenticationRequirement,
        isBlocked: (s.status?.errorCode || 0) !== 0,
        caPolicies,
        caBlocked,
        caApplied,
        riskLevel: s.riskLevelDuringSignIn || 'none',
        riskState: s.riskState || 'none'
      };
    });

    // Summary
    const summary = {
      total: enriched.length,
      successful: enriched.filter(s => !s.isBlocked).length,
      blocked: enriched.filter(s => s.isBlocked).length,
      caBlocked: enriched.filter(s => s.caBlocked.length > 0).length,
      mfaRequired: enriched.filter(s => s.authenticationRequirement === 'multiFactorAuthentication').length,
      riskySignIns: enriched.filter(s => s.riskLevel !== 'none' && s.riskLevel !== 'hidden').length
    };

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { summary, signIns: enriched }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
