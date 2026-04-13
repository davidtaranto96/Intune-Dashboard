const { graphRequest, getAccessToken } = require('../graphClient');
const fetch = require('isomorphic-fetch');

module.exports = async function (context, req) {
  try {
    const filter = req.query.filter || '';
    const top = Math.min(parseInt(req.query.top) || 250, 1000);
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const search = req.query.search || '';

    // Build the query - get recent sign-ins
    // Graph signIns: page size caps at 1000, but filter + orderby must be built carefully.
    // Use $filter for time range (Graph retains ~30 days for signIns). Strip milliseconds
    // from ISO timestamps — Graph filter parser rejects fractional seconds on this endpoint.
    const filters = [];

    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      // Format as 2026-04-06T12:34:56Z (no milliseconds) — required by Graph signIns filter.
      const isoSince = since.toISOString().split('.')[0] + 'Z';
      filters.push(`createdDateTime ge ${isoSince}`);
    }

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
      filters.push(`(startswith(userDisplayName,'${search}') or startswith(userPrincipalName,'${search}'))`);
    }

    // Page size for the first request. signIns endpoint doesn't support $orderby reliably
    // with certain filter combinations — it natively returns newest-first, so we skip $orderby.
    const pageSize = Math.min(top, 1000);
    let endpoint = `/auditLogs/signIns?$top=${pageSize}`;
    if (filters.length) {
      endpoint += '&$filter=' + filters.join(' and ');
    }

    // Paginate until we hit `top` results or exhaust the time window.
    // This is the key fix: without pagination, $top=100 + high-volume tenants returned
    // only today's records because the first page was already saturated.
    const signIns = [];
    let url = `https://graph.microsoft.com/v1.0${endpoint}`;
    const token = await getAccessToken();
    let pages = 0;
    const MAX_PAGES = 10; // safety cap: up to 10,000 records

    while (url && signIns.length < top && pages < MAX_PAGES) {
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Graph API error: ${resp.status} - ${err}`);
      }
      const pageData = await resp.json();
      if (pageData.value) signIns.push(...pageData.value);
      url = pageData['@odata.nextLink'] || null;
      pages++;
    }

    // Trim to requested top
    if (signIns.length > top) signIns.length = top;

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
          isManaged: s.deviceDetail?.isManaged,
          trustType: s.deviceDetail?.trustType
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
