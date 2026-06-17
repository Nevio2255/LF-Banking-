// netlify/functions/_blob-helper.js
// Gemeinsamer Helper: stellt sicher, dass Netlify Blobs auch dann funktioniert,
// wenn die automatische Site-Erkennung in der Function-Umgebung fehlschlägt.
const { getStore } = require('@netlify/blobs');

function safeGetStore(name) {
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getStore({ name, siteID, token, consistency: 'strong' });
  }
  return getStore({ name, consistency: 'strong' });
}

module.exports = { safeGetStore };
