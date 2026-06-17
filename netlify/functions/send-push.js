// netlify/functions/send-push.js
// Verschickt eine echte Push-Mitteilung an den Nutzer — funktioniert auch wenn
// die App komplett geschlossen ist (echtes Web Push über Apple/Google).
const webpush = require('web-push');
const { safeGetStore } = require('./_blob-helper');

webpush.setVapidDetails(
  'mailto:admin@luxefinds.example',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const userId = body.userId || 'default-user';
    const title = body.title || 'LuxeFinds E-Banking';
    const message = body.body || 'Du hast eine neue Mitteilung.';

    const store = safeGetStore('push-subscriptions');
    const subscription = await store.get(userId, { type: 'json' });

    if (!subscription) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Keine Subscription gefunden für ' + userId })
      };
    }

    const payload = JSON.stringify({ title, body: message });

    await webpush.sendNotification(subscription, payload);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
