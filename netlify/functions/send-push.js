// netlify/functions/send-push.js
// Verschickt eine echte Push-Mitteilung an den Nutzer — funktioniert auch wenn
// die App komplett geschlossen ist (echtes Web Push über Apple/Google).
const webpush = require('web-push');
const { safeGetStore } = require('./_blob-helper');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:admin@luxefinds.example',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

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
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlt in Environment Variables' })
      };
    }

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

    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 });
    } catch (pushErr) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'sendNotification failed',
          message: pushErr.message,
          pushStatusCode: pushErr.statusCode,
          pushBody: pushErr.body,
          pushHeaders: pushErr.headers
        })
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  }
};
