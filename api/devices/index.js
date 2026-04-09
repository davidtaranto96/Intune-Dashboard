const { graphRequestAllPages, graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    // Get Intune managed devices
    const managedDevices = await graphRequestAllPages('/deviceManagement/managedDevices');

    // Get Entra ID (Azure AD) devices
    const entraDevices = await graphRequestAllPages('/devices');

    // Get compliance policy statuses per device (which policies each device fails)
    const compliancePolicies = await graphRequestAllPages('/deviceManagement/deviceCompliancePolicies');

    // Build device-to-policy-violation map
    const deviceViolations = new Map();
    await Promise.all(
      compliancePolicies.map(async (policy) => {
        try {
          const statuses = await graphRequestAllPages(
            `/deviceManagement/deviceCompliancePolicies/${policy.id}/deviceStatuses`
          );
          for (const status of statuses) {
            const deviceId = status.deviceDisplayName;
            if (status.status !== 'compliant' && status.status !== 'notApplicable') {
              if (!deviceViolations.has(status.id)) {
                // Try to match by device name since deviceStatuses use device name
                for (const md of managedDevices) {
                  const key = md.id;
                  if (status.deviceDisplayName === md.deviceName) {
                    if (!deviceViolations.has(key)) {
                      deviceViolations.set(key, []);
                    }
                    deviceViolations.get(key).push({
                      policyId: policy.id,
                      policyName: policy.displayName,
                      status: status.status,
                      lastReportedDateTime: status.lastReportedDateTime,
                      userPrincipalName: status.userPrincipalName
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          // Some policies may not have device statuses
        }
      })
    );

    // Build a map of Entra devices by deviceId for quick lookup
    const entraMap = new Map();
    for (const d of entraDevices) {
      entraMap.set(d.deviceId, d);
    }

    // Merge and enrich device data
    const now = new Date();
    const devices = managedDevices.map(device => {
      const entraDevice = entraMap.get(device.azureADDeviceId);
      const lastSync = device.lastSyncDateTime ? new Date(device.lastSyncDateTime) : null;
      const enrolledDate = device.enrolledDateTime ? new Date(device.enrolledDateTime) : null;

      const daysSinceSync = lastSync
        ? Math.floor((now - lastSync) / (1000 * 60 * 60 * 24))
        : null;

      let graceStatus = 'none';
      if (enrolledDate) {
        const daysSinceEnrollment = Math.floor((now - enrolledDate) / (1000 * 60 * 60 * 24));
        if (daysSinceEnrollment <= 7) {
          graceStatus = 'grace_period';
        }
      }

      return {
        id: device.id,
        deviceName: device.deviceName,
        userDisplayName: device.userDisplayName,
        userPrincipalName: device.userPrincipalName,
        operatingSystem: device.operatingSystem,
        osVersion: device.osVersion,
        complianceState: device.complianceState,
        managementAgent: device.managementAgent,
        enrolledDateTime: device.enrolledDateTime,
        lastSyncDateTime: device.lastSyncDateTime,
        daysSinceSync,
        graceStatus,
        model: device.model,
        manufacturer: device.manufacturer,
        serialNumber: device.serialNumber,
        isEncrypted: device.isEncrypted,
        azureADRegistered: entraDevice ? entraDevice.isCompliant : null,
        entraDeviceId: entraDevice ? entraDevice.id : null,
        trustType: entraDevice ? entraDevice.trustType : null,
        policyViolations: deviceViolations.get(device.id) || []
      };
    });

    // Entra-only devices
    const managedAzureIds = new Set(managedDevices.map(d => d.azureADDeviceId));
    const entraOnlyDevices = entraDevices
      .filter(d => !managedAzureIds.has(d.deviceId))
      .map(d => ({
        id: d.id,
        deviceName: d.displayName,
        operatingSystem: d.operatingSystem,
        osVersion: d.operatingSystemVersion,
        complianceState: 'entra_only',
        managementAgent: 'none',
        enrolledDateTime: null,
        lastSyncDateTime: d.approximateLastSignInDateTime,
        daysSinceSync: d.approximateLastSignInDateTime
          ? Math.floor((new Date() - new Date(d.approximateLastSignInDateTime)) / (1000 * 60 * 60 * 24))
          : null,
        graceStatus: 'none',
        trustType: d.trustType,
        entraDeviceId: d.id,
        azureADRegistered: d.isCompliant,
        policyViolations: []
      }));

    const allDevices = [...devices, ...entraOnlyDevices];

    const summary = {
      total: allDevices.length,
      compliant: allDevices.filter(d => d.complianceState === 'compliant').length,
      nonCompliant: allDevices.filter(d => d.complianceState === 'noncompliant').length,
      inGracePeriod: allDevices.filter(d => d.graceStatus === 'grace_period').length,
      entraOnly: entraOnlyDevices.length,
      notSyncedIn7Days: allDevices.filter(d => d.daysSinceSync > 7).length,
      byOS: {},
      byCompliance: {}
    };

    // OS breakdown for charts
    allDevices.forEach(d => {
      const os = d.operatingSystem || 'Unknown';
      summary.byOS[os] = (summary.byOS[os] || 0) + 1;
      const state = d.graceStatus === 'grace_period' ? 'Grace Period' :
        d.complianceState === 'compliant' ? 'Compliant' :
        d.complianceState === 'noncompliant' ? 'Non-Compliant' :
        d.complianceState === 'entra_only' ? 'Entra Only' : 'Unknown';
      summary.byCompliance[state] = (summary.byCompliance[state] || 0) + 1;
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { summary, devices: allDevices }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
