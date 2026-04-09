const { graphRequestAllPages, graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    // Get Intune managed devices
    const managedDevices = await graphRequestAllPages('/deviceManagement/managedDevices');

    // Get Entra ID (Azure AD) devices
    const entraDevices = await graphRequestAllPages('/devices');

    // Build a map of Entra devices by deviceId for quick lookup
    const entraMap = new Map();
    for (const d of entraDevices) {
      entraMap.set(d.deviceId, d);
    }

    // Merge and enrich device data
    const devices = managedDevices.map(device => {
      const entraDevice = entraMap.get(device.azureADDeviceId);
      const now = new Date();
      const lastSync = device.lastSyncDateTime ? new Date(device.lastSyncDateTime) : null;
      const enrolledDate = device.enrolledDateTime ? new Date(device.enrolledDateTime) : null;

      // Calculate days since last sync
      const daysSinceSync = lastSync
        ? Math.floor((now - lastSync) / (1000 * 60 * 60 * 24))
        : null;

      // Determine grace period status (new devices get 7 days)
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
        trustType: entraDevice ? entraDevice.trustType : null
      };
    });

    // Also include Entra-only devices (not in Intune)
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
        azureADRegistered: d.isCompliant
      }));

    const allDevices = [...devices, ...entraOnlyDevices];

    // Summary stats
    const summary = {
      total: allDevices.length,
      compliant: allDevices.filter(d => d.complianceState === 'compliant').length,
      nonCompliant: allDevices.filter(d => d.complianceState === 'noncompliant').length,
      inGracePeriod: allDevices.filter(d => d.graceStatus === 'grace_period').length,
      entraOnly: entraOnlyDevices.length,
      notSyncedIn7Days: allDevices.filter(d => d.daysSinceSync > 7).length
    };

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
