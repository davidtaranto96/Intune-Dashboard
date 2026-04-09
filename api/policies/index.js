const { graphRequestAllPages } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    // Get compliance policies
    const compliancePolicies = await graphRequestAllPages(
      '/deviceManagement/deviceCompliancePolicies'
    );

    // Get policy assignments and status for each compliance policy
    const enrichedCompliance = await Promise.all(
      compliancePolicies.map(async (policy) => {
        let deviceStatuses = [];
        try {
          deviceStatuses = await graphRequestAllPages(
            `/deviceManagement/deviceCompliancePolicies/${policy.id}/deviceStatuses`
          );
        } catch (e) {
          // Some policies may not have device statuses
        }

        const statusSummary = {
          compliant: deviceStatuses.filter(s => s.status === 'compliant').length,
          nonCompliant: deviceStatuses.filter(s => s.status === 'nonCompliant').length,
          error: deviceStatuses.filter(s => s.status === 'error').length,
          inGracePeriod: deviceStatuses.filter(s => s.status === 'inGracePeriod').length,
          notApplicable: deviceStatuses.filter(s => s.status === 'notApplicable').length
        };

        return {
          id: policy.id,
          displayName: policy.displayName,
          description: policy.description,
          createdDateTime: policy.createdDateTime,
          lastModifiedDateTime: policy.lastModifiedDateTime,
          type: 'compliance',
          platform: policy['@odata.type'] || 'unknown',
          statusSummary
        };
      })
    );

    // Get Conditional Access policies
    let conditionalAccessPolicies = [];
    try {
      conditionalAccessPolicies = await graphRequestAllPages(
        '/identity/conditionalAccess/policies'
      );
      conditionalAccessPolicies = conditionalAccessPolicies.map(policy => ({
        id: policy.id,
        displayName: policy.displayName,
        state: policy.state,
        createdDateTime: policy.createdDateTime,
        modifiedDateTime: policy.modifiedDateTime,
        type: 'conditionalAccess',
        conditions: {
          platforms: policy.conditions?.platforms,
          applications: policy.conditions?.applications,
          users: policy.conditions?.users
        },
        grantControls: policy.grantControls
      }));
    } catch (e) {
      // May not have permissions for CA policies
    }

    // Get App Protection policies
    let appProtectionPolicies = [];
    try {
      const iosAppProtection = await graphRequestAllPages(
        '/deviceAppManagement/iosManagedAppProtections'
      );
      const androidAppProtection = await graphRequestAllPages(
        '/deviceAppManagement/androidManagedAppProtections'
      );
      appProtectionPolicies = [
        ...iosAppProtection.map(p => ({ ...p, type: 'appProtection', platform: 'iOS' })),
        ...androidAppProtection.map(p => ({ ...p, type: 'appProtection', platform: 'Android' }))
      ];
    } catch (e) {
      // May not have permissions
    }

    const summary = {
      compliancePolicies: enrichedCompliance.length,
      conditionalAccessPolicies: conditionalAccessPolicies.length,
      appProtectionPolicies: appProtectionPolicies.length
    };

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        summary,
        compliancePolicies: enrichedCompliance,
        conditionalAccessPolicies,
        appProtectionPolicies
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
