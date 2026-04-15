const { graphRequest, mdeRequest } = require('../graphClient');

// Tries MDE API first (Machine.Read.All on WindowsDefenderATP), falls back to Intune Graph API
module.exports = async function (context, req) {
  // --- Attempt 1: MDE API (api.securitycenter.microsoft.com) ---
  try {
    const data = await mdeRequest('/machines?$top=100&$orderby=riskScore desc');
    const machines = (data.value || []).map(m => ({
      id: m.id,
      computerDnsName: m.computerDnsName,
      osPlatform: m.osPlatform,
      osVersion: m.osVersion,
      riskScore: m.riskScore,           // none, informational, low, medium, high
      exposureLevel: m.exposureLevel,   // none, low, medium, high
      healthStatus: m.healthStatus,     // Active, Inactive, ImpairedCommunication
      lastSeen: m.lastSeen,
      lastIpAddress: m.lastIpAddress,
      userPrincipalName: m.lastLoggedOnUser || '',
      avStatus: m.defenderAvStatus,
      onboardingStatus: m.onboardingStatus,
      issues: [],
      source: 'mde'
    }));

    const summary = {
      total: machines.length,
      riskHigh:   machines.filter(m => m.riskScore === 'high').length,
      riskMedium: machines.filter(m => m.riskScore === 'medium').length,
      riskLow:    machines.filter(m => m.riskScore === 'low').length,
      exposureHigh: machines.filter(m => m.exposureLevel === 'high').length,
      inactive:   machines.filter(m => m.healthStatus !== 'Active').length,
      malware: 0,
      avDisabled: 0,
      stale: 0,
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, machines, source: 'mde' } };
    return;
  } catch (mdeError) {
    // MDE not available — fall through to Graph/Intune
  }

  // --- Fallback: Intune Graph API (DeviceManagementManagedDevices.Read.All) ---
  try {
    const select = 'id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,windowsProtectionState,userPrincipalName,userDisplayName';
    const data = await graphRequest(`/deviceManagement/managedDevices?$top=100&$select=${select}&$orderby=lastSyncDateTime desc`);

    const machines = (data.value || []).map(m => {
      const wp = m.windowsProtectionState || {};
      let riskScore = 'none';
      let issues = [];

      if (wp.detectedMalwareCount > 0) { riskScore = 'high'; issues.push(`${wp.detectedMalwareCount} malware detected`); }
      else if (wp.malwareProtectionEnabled === false) { riskScore = 'medium'; issues.push('Malware protection OFF'); }
      else if (wp.realTimeProtectionEnabled === false) { riskScore = 'medium'; issues.push('Real-time protection OFF'); }
      else if (wp.signatureUpdateOverdue) { riskScore = 'medium'; issues.push('Signature update overdue'); }
      else if (wp.quickScanOverdue || wp.fullScanOverdue) { riskScore = 'low'; issues.push('Scan overdue'); }

      const daysSinceSync = m.lastSyncDateTime
        ? Math.floor((Date.now() - new Date(m.lastSyncDateTime)) / 86400000) : 999;
      if (daysSinceSync > 7 && riskScore === 'none') { riskScore = 'low'; issues.push(`Stale (${daysSinceSync}d)`); }

      return {
        id: m.id,
        computerDnsName: m.deviceName,
        osPlatform: m.operatingSystem,
        osVersion: m.osVersion,
        complianceState: m.complianceState,
        lastSeen: m.lastSyncDateTime,
        daysSinceSync,
        userPrincipalName: m.userPrincipalName,
        userDisplayName: m.userDisplayName,
        riskScore,
        exposureLevel: null,
        healthStatus: daysSinceSync <= 7 ? 'Active' : 'Inactive',
        issues,
        avEnabled: wp.malwareProtectionEnabled,
        realTimeEnabled: wp.realTimeProtectionEnabled,
        signatureOverdue: wp.signatureUpdateOverdue,
        malwareCount: wp.detectedMalwareCount || 0,
        source: 'intune'
      };
    });

    const summary = {
      total: machines.length,
      riskHigh:   machines.filter(m => m.riskScore === 'high').length,
      riskMedium: machines.filter(m => m.riskScore === 'medium').length,
      riskLow:    machines.filter(m => m.riskScore === 'low').length,
      malware:    machines.filter(m => m.malwareCount > 0).length,
      avDisabled: machines.filter(m => m.avEnabled === false).length,
      stale:      machines.filter(m => m.daysSinceSync > 7).length,
      exposureHigh: 0,
      inactive:   machines.filter(m => m.healthStatus !== 'Active').length,
    };

    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { summary, machines, source: 'intune' } };
  } catch (error) {
    context.res = { status: 500, body: { error: error.message, hint: 'Requires DeviceManagementManagedDevices.Read.All (Graph) or Machine.Read.All (WindowsDefenderATP).' } };
  }
};
