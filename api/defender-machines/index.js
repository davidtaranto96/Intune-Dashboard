const { mdeRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const data = await mdeRequest('/machines?$top=100&$orderby=riskScore desc');
    const machines = (data.value || []).map(m => ({
      id: m.id,
      computerDnsName: m.computerDnsName,
      osPlatform: m.osPlatform,
      osVersion: m.osVersion,
      riskScore: m.riskScore,         // none, informational, low, medium, high
      exposureLevel: m.exposureLevel, // none, low, medium, high
      healthStatus: m.healthStatus,   // Active, Inactive, ImpairedCommunication, NoSensorData, NoSensorDataImpairedCommunication
      lastSeen: m.lastSeen,
      lastIpAddress: m.lastIpAddress,
      aadDeviceId: m.aadDeviceId,
      managedBy: m.managedBy,
      onboardingStatus: m.onboardingStatus,
      defenderAvStatus: m.defenderAvStatus,
      tags: m.machineTags || []
    }));

    const summary = {
      total: machines.length,
      riskHigh:   machines.filter(m => m.riskScore === 'high').length,
      riskMedium: machines.filter(m => m.riskScore === 'medium').length,
      riskLow:    machines.filter(m => m.riskScore === 'low').length,
      exposureHigh:   machines.filter(m => m.exposureLevel === 'high').length,
      exposureMedium: machines.filter(m => m.exposureLevel === 'medium').length,
      inactive:   machines.filter(m => m.healthStatus !== 'Active').length,
      active:     machines.filter(m => m.healthStatus === 'Active').length,
    };

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { summary, machines }
    };
  } catch (error) {
    let hint = 'Requires Machine.Read.All permission on the Defender for Endpoint API (api.securitycenter.microsoft.com), granted via Azure AD app registration.';
    if (error.message.includes('401')) hint = 'Authentication failed. Add Machine.Read.All application permission for WindowsDefenderATP in your app registration.';
    if (error.message.includes('403')) hint = 'Permission denied. Grant Machine.Read.All for WindowsDefenderATP and ensure admin consent was given.';
    context.res = { status: 500, body: { error: error.message, hint } };
  }
};
