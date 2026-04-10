const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    // Fetch active member accounts from Entra ID (exclude guests and service accounts)
    const [usersData, devicesData] = await Promise.all([
      graphRequest("/users?$filter=accountEnabled eq true and userType eq 'Member'&$select=displayName,userPrincipalName&$top=300"),
      graphRequest('/deviceManagement/managedDevices?$select=userPrincipalName,userDisplayName,deviceName,operatingSystem,complianceState&$top=500')
    ]);

    const entraUsers = (usersData.value || []).filter(u => u.userPrincipalName && !u.userPrincipalName.includes('#EXT#'));
    const managedDevices = devicesData.value || [];

    // Map UPN -> devices for quick lookup
    const devicesByUpn = {};
    for (const device of managedDevices) {
      const upn = (device.userPrincipalName || '').toLowerCase();
      if (!upn) continue;
      if (!devicesByUpn[upn]) devicesByUpn[upn] = [];
      devicesByUpn[upn].push({
        deviceName: device.deviceName,
        operatingSystem: device.operatingSystem,
        complianceState: device.complianceState
      });
    }

    const usersWithDevices = [];
    const usersWithoutDevices = [];

    for (const user of entraUsers) {
      const upn = (user.userPrincipalName || '').toLowerCase();
      const devices = devicesByUpn[upn] || [];
      if (devices.length > 0) {
        usersWithDevices.push({
          displayName: user.displayName,
          userPrincipalName: user.userPrincipalName,
          deviceCount: devices.length,
          devices
        });
      } else {
        usersWithoutDevices.push({
          displayName: user.displayName,
          userPrincipalName: user.userPrincipalName
        });
      }
    }

    // Also find devices with no user assigned (shared/kiosk devices)
    const unassignedDevices = managedDevices
      .filter(d => !d.userPrincipalName)
      .map(d => ({ deviceName: d.deviceName, operatingSystem: d.operatingSystem, complianceState: d.complianceState }));

    const total = usersWithDevices.length + usersWithoutDevices.length;
    const coveragePercent = total > 0 ? Math.round(usersWithDevices.length / total * 100) : 0;

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        summary: {
          total,
          withDevices: usersWithDevices.length,
          withoutDevices: usersWithoutDevices.length,
          coveragePercent,
          unassignedDevices: unassignedDevices.length
        },
        usersWithDevices,
        usersWithoutDevices,
        unassignedDevices
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
