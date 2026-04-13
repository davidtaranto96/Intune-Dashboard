const { graphRequest } = require('../graphClient');

module.exports = async function (context, req) {
  try {
    const { recipients, sender, checks } = req.body || {};

    if (!recipients || !recipients.length) {
      context.res = { status: 400, body: { error: 'No recipients provided' } };
      return;
    }
    if (!sender) {
      context.res = { status: 400, body: { error: 'No sender email provided' } };
      return;
    }

    // Gather current data for the alert
    const sections = [];

    if (checks && checks.nonCompliant) {
      try {
        const devData = await graphRequest('/deviceManagement/managedDevices?$filter=complianceState eq \'noncompliant\'&$select=deviceName,userDisplayName,userPrincipalName,operatingSystem,lastSyncDateTime&$top=20');
        const devs = devData.value || [];
        if (devs.length) {
          const rows = devs.map(d =>
            `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.deviceName || '-'}</td>` +
            `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.userDisplayName || '-'}</td>` +
            `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.operatingSystem || '-'}</td>` +
            `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : '-'}</td></tr>`
          ).join('');
          sections.push(`
            <h3 style="color:#d13438;margin:20px 0 10px;">&#128683; Non-Compliant Devices (${devs.length})</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f8f8f8;">
                <th style="padding:8px 12px;text-align:left;">Device</th>
                <th style="padding:8px 12px;text-align:left;">User</th>
                <th style="padding:8px 12px;text-align:left;">OS</th>
                <th style="padding:8px 12px;text-align:left;">Last Sync</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`);
        }
      } catch (e) { /* skip if permission missing */ }
    }

    if (checks && (checks.blocked || checks.risky || checks.locked)) {
      try {
        const sigData = await graphRequest('/auditLogs/signIns?$top=50&$orderby=createdDateTime desc');
        const signIns = sigData.value || [];

        if (checks.blocked) {
          const blocked = signIns.filter(s => (s.status?.errorCode || 0) !== 0).slice(0, 10);
          if (blocked.length) {
            const rows = blocked.map(s =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.userDisplayName || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.userPrincipalName || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.status?.failureReason || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.ipAddress || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.createdDateTime ? new Date(s.createdDateTime).toLocaleString() : '-'}</td></tr>`
            ).join('');
            sections.push(`
              <h3 style="color:#d13438;margin:20px 0 10px;">&#128272; Blocked Sign-ins (${blocked.length})</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8f8f8;">
                  <th style="padding:8px 12px;text-align:left;">User</th>
                  <th style="padding:8px 12px;text-align:left;">UPN</th>
                  <th style="padding:8px 12px;text-align:left;">Reason</th>
                  <th style="padding:8px 12px;text-align:left;">IP</th>
                  <th style="padding:8px 12px;text-align:left;">Time</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>`);
          }
        }

        if (checks.risky) {
          const risky = signIns.filter(s => s.riskLevelDuringSignIn === 'high' || s.riskLevelDuringSignIn === 'medium').slice(0, 10);
          if (risky.length) {
            const rows = risky.map(s =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.userDisplayName || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.riskLevelDuringSignIn}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.ipAddress || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.createdDateTime ? new Date(s.createdDateTime).toLocaleString() : '-'}</td></tr>`
            ).join('');
            sections.push(`
              <h3 style="color:#ff8c00;margin:20px 0 10px;">&#9888; Risky Sign-ins (${risky.length})</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8f8f8;">
                  <th style="padding:8px 12px;text-align:left;">User</th>
                  <th style="padding:8px 12px;text-align:left;">Risk Level</th>
                  <th style="padding:8px 12px;text-align:left;">IP</th>
                  <th style="padding:8px 12px;text-align:left;">Time</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>`);
          }
        }

        if (checks.locked) {
          const locked = signIns.filter(s => (s.status?.errorCode || 0) !== 0 && s.status?.failureReason?.toLowerCase().includes('locked')).slice(0, 10);
          if (locked.length) {
            const rows = locked.map(s =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.userDisplayName || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.userPrincipalName || '-'}</td>` +
              `<td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${s.createdDateTime ? new Date(s.createdDateTime).toLocaleString() : '-'}</td></tr>`
            ).join('');
            sections.push(`
              <h3 style="color:#8b0000;margin:20px 0 10px;">&#128274; Account Lockouts (${locked.length})</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:#f8f8f8;">
                  <th style="padding:8px 12px;text-align:left;">User</th>
                  <th style="padding:8px 12px;text-align:left;">UPN</th>
                  <th style="padding:8px 12px;text-align:left;">Time</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>`);
          }
        }
      } catch (e) { /* skip if AuditLog.Read.All not available */ }
    }

    if (!sections.length) {
      sections.push('<p style="color:#107c10;font-size:14px;">&#10003; No issues detected at this time. All systems appear healthy.</p>');
    }

    const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0078d4,#005a9e);color:white;padding:20px 28px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:20px;">&#128203; Intune Compliance Dashboard</h1>
          <div style="font-size:13px;opacity:0.8;margin-top:4px;">Security & Compliance Alert — JBKnowledge IT</div>
        </div>
        <div style="background:white;padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:13px;color:#666;margin-top:0;">Generated: <strong>${now} CT</strong></p>
          ${sections.join('\n')}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e0e0e0;">
          <p style="font-size:11px;color:#999;">This alert was sent from the Intune Compliance Dashboard. Reply to this email or contact IT for questions.</p>
        </div>
      </div>`;

    const toRecipients = recipients.map(email => ({ emailAddress: { address: email } }));

    await graphRequest(`/users/${encodeURIComponent(sender)}/sendMail`, 'POST', {
      message: {
        subject: `[Intune Dashboard] Security & Compliance Alert — ${new Date().toLocaleDateString()}`,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients
      },
      saveToSentItems: false
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { success: true, sent: recipients.length }
    };
  } catch (error) {
    const msg = error.message || '';
    let hint = msg;
    if (msg.includes('MailboxNotEnabledForRESTAPI') || msg.includes('license')) {
      hint = 'The sender mailbox requires an Exchange Online license. Use a licensed user mailbox (not a shared mailbox without license).';
    } else if (msg.includes('Mail.Send') || msg.includes('403') || msg.includes('Authorization')) {
      hint = 'Missing Mail.Send permission. Add it in Azure App Registration > API Permissions and grant admin consent.';
    }
    context.res = {
      status: 500,
      body: { error: hint }
    };
  }
};
