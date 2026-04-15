const fetch = require('isomorphic-fetch');

const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

async function graphRequest(endpoint, method = 'GET', body = null, apiVersion = 'v1.0') {
  const token = await getAccessToken();
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://graph.microsoft.com/${apiVersion}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error: ${response.status} - ${error}`);
  }

  // Some endpoints return no body (204 No Content, 202 Accepted for sendMail)
  if (response.status === 204 || response.status === 202 || response.headers.get('content-length') === '0') {
    return { success: true };
  }

  return response.json();
}

async function graphRequestAllPages(endpoint) {
  const results = [];
  let url = `https://graph.microsoft.com/v1.0${endpoint}`;
  const token = await getAccessToken();

  while (url) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Graph API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    if (data.value) {
      results.push(...data.value);
    }
    url = data['@odata.nextLink'] || null;
  }

  return results;
}

module.exports = { getAccessToken, graphRequest, graphRequestAllPages };
