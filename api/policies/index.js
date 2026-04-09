const { graphRequestAllPages, graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  // PATCH: update a policy
  if (req.method === 'PATCH') {
    return await handlePatch(context, req);
  }

  try {
    // Get compliance policies with full details
    const compliancePolicies = await graphRequestAllPages(
      '/deviceManagement/deviceCompliancePolicies?$expand=assignments'
    );

    const enrichedCompliance = await Promise.all(
      compliancePolicies.map(async (policy) => {
        let deviceStatuses = [];
        try {
          deviceStatuses = await graphRequestAllPages(
            `/deviceManagement/deviceCompliancePolicies/${policy.id}/deviceStatuses`
          );
        } catch (e) {}

        const statusSummary = {
          compliant: deviceStatuses.filter(s => s.status === 'compliant').length,
          nonCompliant: deviceStatuses.filter(s => s.status === 'nonCompliant').length,
          error: deviceStatuses.filter(s => s.status === 'error').length,
          inGracePeriod: deviceStatuses.filter(s => s.status === 'inGracePeriod').length,
          notApplicable: deviceStatuses.filter(s => s.status === 'notApplicable').length
        };

        const deviceDetails = deviceStatuses
          .filter(s => s.status !== 'notApplicable')
          .map(s => ({
            deviceName: s.deviceDisplayName,
            status: s.status,
            userPrincipalName: s.userPrincipalName,
            lastReportedDateTime: s.lastReportedDateTime,
            complianceGracePeriodExpirationDateTime: s.complianceGracePeriodExpirationDateTime
          }));

        // Extract human-readable settings based on policy type
        const settings = extractComplianceSettings(policy);

        return {
          id: policy.id,
          displayName: policy.displayName,
          description: policy.description,
          createdDateTime: policy.createdDateTime,
          lastModifiedDateTime: policy.lastModifiedDateTime,
          type: 'compliance',
          odataType: policy['@odata.type'] || 'unknown',
          platform: getPlatformName(policy['@odata.type']),
          settings,
          rawPolicy: policy,
          statusSummary,
          deviceDetails
        };
      })
    );

    // Get Conditional Access policies with full details
    let conditionalAccessPolicies = [];
    try {
      conditionalAccessPolicies = await graphRequestAllPages(
        '/identity/conditionalAccess/policies'
      );
      conditionalAccessPolicies = conditionalAccessPolicies.map(policy => ({
        id: policy.id,
        displayName: policy.displayName,
        description: policy.description || '',
        state: policy.state,
        createdDateTime: policy.createdDateTime,
        modifiedDateTime: policy.modifiedDateTime,
        type: 'conditionalAccess',
        conditions: {
          users: policy.conditions?.users,
          applications: policy.conditions?.applications,
          platforms: policy.conditions?.platforms,
          locations: policy.conditions?.locations,
          clientAppTypes: policy.conditions?.clientAppTypes,
          signInRiskLevels: policy.conditions?.signInRiskLevels,
          userRiskLevels: policy.conditions?.userRiskLevels
        },
        grantControls: policy.grantControls,
        sessionControls: policy.sessionControls,
        conditionsSummary: summarizeCAConditions(policy),
        grantSummary: summarizeCAGrants(policy)
      }));
    } catch (e) {}

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
    } catch (e) {}

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

async function handlePatch(context, req) {
  try {
    const { policyType, policyId, updates } = req.body || {};

    if (!policyType || !policyId || !updates) {
      context.res = { status: 400, body: { error: 'Missing policyType, policyId, or updates' } };
      return;
    }

    let endpoint;
    if (policyType === 'compliance') {
      endpoint = `/deviceManagement/deviceCompliancePolicies/${policyId}`;
    } else if (policyType === 'conditionalAccess') {
      endpoint = `/identity/conditionalAccess/policies/${policyId}`;
    } else {
      context.res = { status: 400, body: { error: 'Invalid policyType' } };
      return;
    }

    await graphRequest(endpoint, 'PATCH', updates);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { success: true, message: 'Policy updated successfully' }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
}

function getPlatformName(odataType) {
  if (!odataType) return 'Unknown';
  if (odataType.includes('windows10')) return 'Windows 10/11';
  if (odataType.includes('Windows81')) return 'Windows 8.1';
  if (odataType.includes('ios')) return 'iOS/iPadOS';
  if (odataType.includes('android')) return 'Android';
  if (odataType.includes('macOS') || odataType.includes('macOs')) return 'macOS';
  return odataType.replace('#microsoft.graph.', '');
}

function extractComplianceSettings(policy) {
  const settings = [];
  const type = policy['@odata.type'] || '';

  // Common settings
  if (policy.passwordRequired !== undefined)
    settings.push({ name: 'Password Required', value: policy.passwordRequired ? 'Yes' : 'No', key: 'passwordRequired', type: 'boolean' });
  if (policy.passwordMinimumLength !== undefined && policy.passwordMinimumLength !== null)
    settings.push({ name: 'Minimum Password Length', value: String(policy.passwordMinimumLength), key: 'passwordMinimumLength', type: 'number' });
  if (policy.passwordRequiredType !== undefined)
    settings.push({ name: 'Password Type', value: policy.passwordRequiredType, key: 'passwordRequiredType', type: 'select', options: ['deviceDefault', 'alphanumeric', 'numeric'] });
  if (policy.passwordMinutesOfInactivityBeforeLock !== undefined && policy.passwordMinutesOfInactivityBeforeLock !== null)
    settings.push({ name: 'Inactivity Lock (minutes)', value: String(policy.passwordMinutesOfInactivityBeforeLock), key: 'passwordMinutesOfInactivityBeforeLock', type: 'number' });
  if (policy.passwordExpirationDays !== undefined && policy.passwordExpirationDays !== null)
    settings.push({ name: 'Password Expiration (days)', value: String(policy.passwordExpirationDays), key: 'passwordExpirationDays', type: 'number' });
  if (policy.passwordPreviousPasswordBlockCount !== undefined && policy.passwordPreviousPasswordBlockCount !== null)
    settings.push({ name: 'Previous Passwords Blocked', value: String(policy.passwordPreviousPasswordBlockCount), key: 'passwordPreviousPasswordBlockCount', type: 'number' });

  // Windows specific
  if (type.includes('windows10') || type.includes('Windows')) {
    if (policy.bitLockerEnabled !== undefined)
      settings.push({ name: 'BitLocker Encryption', value: policy.bitLockerEnabled ? 'Required' : 'Not Required', key: 'bitLockerEnabled', type: 'boolean' });
    if (policy.secureBootEnabled !== undefined)
      settings.push({ name: 'Secure Boot', value: policy.secureBootEnabled ? 'Required' : 'Not Required', key: 'secureBootEnabled', type: 'boolean' });
    if (policy.codeIntegrityEnabled !== undefined)
      settings.push({ name: 'Code Integrity', value: policy.codeIntegrityEnabled ? 'Required' : 'Not Required', key: 'codeIntegrityEnabled', type: 'boolean' });
    if (policy.storageRequireEncryption !== undefined)
      settings.push({ name: 'Storage Encryption', value: policy.storageRequireEncryption ? 'Required' : 'Not Required', key: 'storageRequireEncryption', type: 'boolean' });
    if (policy.activeFirewallRequired !== undefined)
      settings.push({ name: 'Firewall', value: policy.activeFirewallRequired ? 'Required' : 'Not Required', key: 'activeFirewallRequired', type: 'boolean' });
    if (policy.antivirusRequired !== undefined)
      settings.push({ name: 'Antivirus', value: policy.antivirusRequired ? 'Required' : 'Not Required', key: 'antivirusRequired', type: 'boolean' });
    if (policy.antiSpywareRequired !== undefined)
      settings.push({ name: 'Anti-Spyware', value: policy.antiSpywareRequired ? 'Required' : 'Not Required', key: 'antiSpywareRequired', type: 'boolean' });
    if (policy.defenderEnabled !== undefined)
      settings.push({ name: 'Microsoft Defender', value: policy.defenderEnabled ? 'Required' : 'Not Required', key: 'defenderEnabled', type: 'boolean' });
    if (policy.rtpEnabled !== undefined)
      settings.push({ name: 'Real-Time Protection', value: policy.rtpEnabled ? 'Required' : 'Not Required', key: 'rtpEnabled', type: 'boolean' });
    if (policy.tpmRequired !== undefined)
      settings.push({ name: 'TPM Required', value: policy.tpmRequired ? 'Yes' : 'No', key: 'tpmRequired', type: 'boolean' });
    if (policy.osMinimumVersion)
      settings.push({ name: 'Minimum OS Version', value: policy.osMinimumVersion, key: 'osMinimumVersion', type: 'text' });
    if (policy.osMaximumVersion)
      settings.push({ name: 'Maximum OS Version', value: policy.osMaximumVersion, key: 'osMaximumVersion', type: 'text' });
  }

  // iOS/Android
  if (type.includes('ios') || type.includes('android')) {
    if (policy.securityBlockJailbrokenDevices !== undefined)
      settings.push({ name: 'Block Jailbroken/Rooted', value: policy.securityBlockJailbrokenDevices ? 'Yes' : 'No', key: 'securityBlockJailbrokenDevices', type: 'boolean' });
    if (policy.managedEmailProfileRequired !== undefined)
      settings.push({ name: 'Managed Email Profile', value: policy.managedEmailProfileRequired ? 'Required' : 'Not Required', key: 'managedEmailProfileRequired', type: 'boolean' });
    if (policy.osMinimumVersion)
      settings.push({ name: 'Minimum OS Version', value: policy.osMinimumVersion, key: 'osMinimumVersion', type: 'text' });
    if (policy.osMaximumVersion)
      settings.push({ name: 'Maximum OS Version', value: policy.osMaximumVersion, key: 'osMaximumVersion', type: 'text' });
  }

  if (settings.length === 0) {
    settings.push({ name: 'Policy Details', value: 'No configurable settings exposed via API', key: null, type: 'info' });
  }

  return settings;
}

function summarizeCAConditions(policy) {
  const parts = [];
  const c = policy.conditions || {};

  if (c.users) {
    if (c.users.includeUsers && c.users.includeUsers.includes('All')) parts.push('All users');
    else if (c.users.includeGroups && c.users.includeGroups.length) parts.push(c.users.includeGroups.length + ' group(s)');
    if (c.users.excludeUsers && c.users.excludeUsers.length) parts.push('Excludes ' + c.users.excludeUsers.length + ' user(s)');
  }

  if (c.applications) {
    if (c.applications.includeApplications && c.applications.includeApplications.includes('All')) parts.push('All apps');
    else if (c.applications.includeApplications) parts.push(c.applications.includeApplications.length + ' app(s)');
  }

  if (c.platforms && c.platforms.includePlatforms) {
    parts.push('Platforms: ' + c.platforms.includePlatforms.join(', '));
  }

  if (c.clientAppTypes && c.clientAppTypes.length) {
    parts.push('Client apps: ' + c.clientAppTypes.join(', '));
  }

  if (c.signInRiskLevels && c.signInRiskLevels.length) {
    parts.push('Sign-in risk: ' + c.signInRiskLevels.join(', '));
  }

  if (c.locations) {
    if (c.locations.includeLocations && c.locations.includeLocations.includes('All')) parts.push('All locations');
  }

  return parts.length ? parts : ['No specific conditions configured'];
}

function summarizeCAGrants(policy) {
  const parts = [];
  const g = policy.grantControls || {};

  if (g.builtInControls && g.builtInControls.length) {
    const controls = g.builtInControls.map(c => {
      switch (c) {
        case 'mfa': return 'Require MFA';
        case 'compliantDevice': return 'Require compliant device';
        case 'domainJoinedDevice': return 'Require Hybrid Azure AD join';
        case 'approvedApplication': return 'Require approved client app';
        case 'compliantApplication': return 'Require app protection policy';
        case 'passwordChange': return 'Require password change';
        case 'block': return 'Block access';
        default: return c;
      }
    });
    parts.push(...controls);
  }

  if (g.operator) {
    parts.push('Operator: ' + g.operator);
  }

  return parts.length ? parts : ['No grant controls configured'];
}
