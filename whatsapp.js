const API_VERSION = 'v20.0';

function apiUrl() {
  return `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

export async function sendWhatsAppMessage(to, text) {
  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('WhatsApp send failed:', res.status, errBody);
  }
  return res.ok;
}

export async function notifyOwner(text) {
  const owner = process.env.OWNER_WHATSAPP_NUMBER;
  if (!owner) return;
  await sendWhatsAppMessage(owner, `[BOT ALERT] ${text}`);
}
