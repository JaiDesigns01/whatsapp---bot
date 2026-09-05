# WhatsApp Convocation/Induction Season Bot

A WhatsApp Business chatbot for a graphic designer, built to handle client
conversations during convocation/induction season: greeting, service info,
pricing, collecting job details, and sharing payment info — end to end,
until you switch it off.

## How it works

1. A client messages your WhatsApp Business number.
2. Meta sends the message to your `/webhook` endpoint.
3. Claude runs the full conversation, professionally and confidently:
   - Greets the client, asks whether they'd like to be addressed as
     **"Sir"** or **"Ma"**, and briefly lists the services offered
   - Once they pick a service, quotes the exact price
   - Collects the specific info required for that service (full name,
     school/department details, pictures, dates/venue, etc. — varies by
     service, see business-rules.js)
   - Once everything is collected, shares your Opay payment details and
     confirms that payment starts the job, with a 1-2 day turnaround
4. You get a WhatsApp notification once an order is fully collected (i.e.
   payment details have been shared), and separately if anything falls
   outside the bot's rules (e.g. a complaint, or an out-of-scope request).
   You then confirm payment yourself before starting work.
5. When something is flagged (`flag_uncertain` — a complaint, an
   out-of-scope request, or a client asking for you directly), the bot
   **pauses itself for that specific client** and stays silent on that
   conversation, so it doesn't talk over you once you step in manually.
   The notification tells you the exact command to send to resume it:
   **"resume [client's number]"** — sent from your own WhatsApp number.
   Other clients are unaffected; this pause only applies to the one
   conversation that was flagged.
6. You can turn the whole bot on/off yourself, from your own WhatsApp, by
   texting the bot number:
   - Send **"bot off"** to deactivate — it goes fully silent for all clients
   - Send **"bot on"** to reactivate
   Only messages from `OWNER_WHATSAPP_NUMBER` in your `.env` are recognized
   as these commands — clients can't trigger them.

## Pricing (current)

- Convocation Flyer, Induction Flyer, or both together — ₦5,000
- Graduation Photoshoot Design — ₦4,000
- Invitation Design — ₦2,000
- Appreciation/Thank-You Design — ₦2,000
- Souvenir Design — ₦2,000

## Setup

### 1. Get WhatsApp Cloud API access
- Create a Meta for Developers app at developers.facebook.com
- Add the "WhatsApp" product
- Use the **Coexistence** option to connect your existing WhatsApp Business
  number (keeps your app working alongside the API — see earlier notes)
- Grab your **Phone Number ID** and a permanent access token

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# fill in WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ANTHROPIC_API_KEY,
# OWNER_WHATSAPP_NUMBER (your own number, for on/off commands + alerts)
```

### 4. Run it
```bash
npm start
```
Use `ngrok http 3000` during development to get a public URL for Meta's
webhook to reach; deploy to Railway/Render/Fly.io for production.

### 5. Connect the webhook in Meta
- Callback URL: `https://your-public-url/webhook`
- Verify Token: same value as `WHATSAPP_VERIFY_TOKEN` in your `.env`
- Subscribe to the `messages` field

## Customizing

- **`business-rules.js`** — the main file to edit: service list, prices,
  payment details, turnaround time, and what info to collect per service.
  All six services currently have prices set.
- **`claude.js`** — controls tone and conversation flow. Currently set to
  professional, warm, and confident — no slang or excessive emojis. Only
  touch this if you want to change *how* the bot behaves, not just the
  prices/info requirements.
- Handles text, images (receipts, pictures, logos), and documents sent by
  clients. Images/documents aren't visually analyzed — the bot can't
  verify the actual receipt amount — but it registers that one was sent
  and treats it as a payment confirmation when it arrives at that stage
  of the conversation. Worth double-checking receipts yourself before
  starting work, since the bot can't confirm the amount matches.

## After convocation season

Text **"bot off"** from your own WhatsApp number to deactivate. The bot
will stop responding to all clients immediately — no redeployment needed.
Send "bot on" any time you want to reactivate it for a future season.
