// netlify/functions/telegram-webhook.js
// Telegram schickt hier jede Nachricht/Befehl hin, den der Mitarbeiter im Bot-Chat eingibt.
// Befehle:
//   /entsperren_<VN>   -> entsperrt die Karte + schickt Push an den User
//   /sperren_<VN>      -> sperrt die Karte + schickt Push an den User
//   /push_<VN> Text... -> schickt freien Text als Push an den User
const webpush = require('web-push');
const { safeGetStore } = require('./_blob-helper');

webpush.setVapidDetails(
  'mailto:admin@luxefinds.example',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendTelegramMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

async function pushToUser(userId, title, body) {
  const store = safeGetStore('push-subscriptions');
  const subscription = await store.get(userId, { type: 'json' });
  if (!subscription) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    return true;
  } catch (e) {
    return false;
  }
}

exports.handler = async (event) => {
  try {
    const update = JSON.parse(event.body || '{}');
    const msg = update.message;
    if (!msg || !msg.text) {
      return { statusCode: 200, body: 'ok' };
    }

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const statusStore = safeGetStore('card-status');

    if (text.startsWith('/entsperren_')) {
      const vn = text.replace('/entsperren_', '');
      await statusStore.setJSON(vn, { locked: false, ts: Date.now() });
      const ok = await pushToUser(vn, 'LuxeFinds E-Banking', 'Deine Karte wurde entsperrt.');
      await sendTelegramMessage(chatId, ok
        ? `✅ Karte ${vn} entsperrt — Mitteilung wurde zugestellt.`
        : `✅ Karte ${vn} entsperrt — aber keine Push-Subscription gefunden (User muss App einmal öffnen).`);
    }
    else if (text.startsWith('/sperren_')) {
      const vn = text.replace('/sperren_', '');
      await statusStore.setJSON(vn, { locked: true, ts: Date.now() });
      const ok = await pushToUser(vn, 'LuxeFinds E-Banking', 'Deine Karte wurde gesperrt.');
      await sendTelegramMessage(chatId, ok
        ? `🔒 Karte ${vn} gesperrt — Mitteilung wurde zugestellt.`
        : `🔒 Karte ${vn} gesperrt — aber keine Push-Subscription gefunden.`);
    }
    else if (text.startsWith('/push_')) {
      const rest = text.replace('/push_', '');
      const [vn, ...words] = rest.split(' ');
      const message = words.join(' ') || 'Du hast eine neue Mitteilung.';
      const ok = await pushToUser(vn, 'LuxeFinds E-Banking', message);
      await sendTelegramMessage(chatId, ok
        ? `📨 Push an ${vn} gesendet: "${message}"`
        : `❌ Keine Subscription für ${vn} gefunden.`);
    }
    else if (text === '/start' || text === '/hilfe') {
      await sendTelegramMessage(chatId,
        '*LuxeFinds Admin Bot*\n\n' +
        '`/entsperren_VN123` – Karte entsperren\n' +
        '`/sperren_VN123` – Karte sperren\n' +
        '`/push_VN123 Dein Text` – freie Mitteilung senden'
      );
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 200, body: 'error: ' + err.message };
  }
};
