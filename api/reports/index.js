const { graphRequestAllPages } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const reportType = req.query.type || 'all';
    const format = req.query.format || 'json';

    // Get all managed devices
    const devices = await graphRequestAllPages('/deviceManagement/managedDevices');

    const now = new Date();
    const enrichedDevices = devices.map(d => {
      const enrolledDate = d.enrolledDateTime ? new Date(d.enrolledDateTime) : null;
      const daysSinceEnrollment = enrolledDate
        ? Math.floor((now - enrolledDate) / (1000 * 60 * 60 * 24))
        : null;

      return {
        deviceName: d.deviceName,
        userDisplayName: d.userDisplayName,
        userPrincipalName: d.userPrincipalName,
        operatingSystem: d.operatingSystem,
        osVersion: d.osVersion,
        complianceState: d.complianceState,
        lastSyncDateTime: d.lastSyncDateTime,
        enrolledDateTime: d.enrolledDateTime,
        model: d.model,
        manufacturer: d.manufacturer,
        serialNumber: d.serialNumber,
        isEncrypted: d.isEncrypted,
        managementAgent: d.managementAgent,
        isGracePeriod: daysSinceEnrollment !== null && daysSinceEnrollment <= 7
      };
    });

    // Filter based on report type
    let filtered;
    switch (reportType) {
      case 'noncompliant':
        filtered = enrichedDevices.filter(d => d.complianceState === 'noncompliant');
        break;
      case 'grace':
        filtered = enrichedDevices.filter(d => d.isGracePeriod);
        break;
      case 'new':
        filtered = enrichedDevices.filter(d => {
          const enrolled = d.enrolledDateTime ? new Date(d.enrolledDateTime) : null;
          return enrolled && (now - enrolled) / (1000 * 60 * 60 * 24) <= 30;
        });
        break;
      case 'all':
      default:
        filtered = enrichedDevices;
        break;
    }

    // Return CSV if requested
    if (format === 'csv') {
      const headers = [
        'Device Name', 'User', 'Email', 'OS', 'OS Version',
        'Compliance State', 'Last Sync', 'Enrolled Date', 'Model',
        'Manufacturer', 'Serial Number', 'Encrypted', 'Management Agent', 'Grace Period'
      ];

      const csvRows = [headers.join(',')];
      for (const d of filtered) {
        csvRows.push([
          escapeCsv(d.deviceName),
          escapeCsv(d.userDisplayName),
          escapeCsv(d.userPrincipalName),
          escapeCsv(d.operatingSystem),
          escapeCsv(d.osVersion),
          escapeCsv(d.complianceState),
          escapeCsv(d.lastSyncDateTime),
          escapeCsv(d.enrolledDateTime),
          escapeCsv(d.model),
          escapeCsv(d.manufacturer),
          escapeCsv(d.serialNumber),
          escapeCsv(String(d.isEncrypted)),
          escapeCsv(d.managementAgent),
          escapeCsv(String(d.isGracePeriod))
        ].join(','));
      }

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=intune-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
        },
        body: csvRows.join('\n')
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        reportType,
        count: filtered.length,
        generatedAt: now.toISOString(),
        devices: filtered
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
