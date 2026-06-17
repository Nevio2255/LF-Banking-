// netlify/functions/save-subscription.js
// Speichert die Push-Subscription des Nutzers (wird einmal beim App-Start aufgerufen)
const { safeGetStore } = require('./_blob-helper');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { subscription, userId } = JSON.parse(event.body);
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid subscription' }) };
    }

    const store = safeGetStore('push-subscriptions');
    const id = userId || 'default-user';
    await store.setJSON(id, subscription);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
