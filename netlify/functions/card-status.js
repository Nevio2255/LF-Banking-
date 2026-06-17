// netlify/functions/card-status.js
// Liefert den aktuellen Sperr-Status der Karte (von der App beim Start abgefragt)
const { safeGetStore } = require('./_blob-helper');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const userId = event.queryStringParameters?.userId || 'default-user';
    const store = safeGetStore('card-status');
    const status = await store.get(userId, { type: 'json' });

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(status || { locked: false })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, hint: 'Blobs nicht verfügbar - prüfe ob Site mit GitHub verbunden ist' })
    };
  }
};
