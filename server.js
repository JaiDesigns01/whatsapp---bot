import 'dotenv/config';
import express from 'express';
import { getHistory, saveMessage, isBotActive, setBotActive, isMuted, setMuted } from './db.js';
import { sendWhatsAppMessage, notifyOwner } from './whatsapp.js';
import { getBotResponse } from './claude.js';

const app = express();
app.use(express.json());

// --- Webhook verification (Meta calls this once when you set up the webhook) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// --- Incoming messages ---
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // ack immediately so Meta doesn't retry

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return;

    const from = message.from;
    const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;

    // Represent non-text messages (receipts, pictures, logos) as a text stand-in
    // so the conversation model knows something was sent, even though it can't see the image itself.
    let text;
    if (message.type === 'text') {
      text = message.text.body;
    } else if (message.type === 'image') {
      text = message.image?.caption
        ? `[Client sent an image with caption: ${message.image.caption}]`
        : '[Client sent an image — likely a payment receipt, picture, or logo]';
    } else if (message.type === 'document') {
      text = '[Client sent a document/file]';
    } else {
      return; // ignore other types (audio, video, location, etc.) for now
    }

    // --- Owner control commands: only work from your own number ---
    if (from === ownerNumber) {
      const command = text.trim().toLowerCase();
      if (command === 'bot off') {
        setBotActive(false);
        await sendWhatsAppMessage(from, 'Bot deactivated. It will stay silent until you send "bot on".');
        return;
      }
      if (command === 'bot on') {
        setBotActive(true);
        await sendWhatsAppMessage(from, 'Bot activated and responding to clients again.');
        return;
      }
      if (command.startsWith('resume ')) {
        const targetNumber = text.trim().slice(7).trim();
        setMuted(targetNumber, false);
        await sendWhatsAppMessage(from, `Bot resumed for ${targetNumber}.`);
        return;
      }
      // any other message from the owner falls through to normal handling below
      // (so you can still text yourself/test without it being treated as a client)
    }

    if (!isBotActive()) {
      // Bot is deactivated (e.g. after convocation season) — stays fully silent
      return;
    }

    if (isMuted(from)) {
      // A previous flag_uncertain paused the bot for this client — just log the message,
      // stay silent, and let you handle it manually until you send "resume <number>"
      saveMessage(from, 'user', text);
      return;
    }

    saveMessage(from, 'user', text);

    const history = getHistory(from);
    const { reply, event, eventDetail } = await getBotResponse(history);

    if (reply) {
      saveMessage(from, 'assistant', reply);
      await sendWhatsAppMessage(from, reply);
    }

    if (event === 'submit_order') {
      await notifyOwner(`New order collected:\n${eventDetail}`);
    } else if (event === 'flag_uncertain') {
      setMuted(from, true);
      await notifyOwner(`Needs your attention (${from}): ${eventDetail}\n\nBot has paused for this client. Send "resume ${from}" once you've handled it.`);
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`WhatsApp bot listening on port ${port}`));
