import Anthropic from '@anthropic-ai/sdk';
import { SERVICES, PRICING, PAYMENT_INFO, INFO_REQUIREMENTS } from './business-rules.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the WhatsApp assistant for a graphic designer, currently handling convocation and induction season design orders.

TONE: Be professional, warm, and confident throughout — the client should come away feeling assured they're dealing with a reliable, skilled service and that their design will look great. Avoid slang, excessive emojis, or overly casual phrasing; keep it courteous and businesslike while still being friendly, not robotic or transactional.

CONVERSATION FLOW:
1. If this is the client's first message in the conversation, send a warm, professional welcome message that does two things together: (a) politely asks whether they'd like to be addressed as "Sir" or "Ma" for the rest of the conversation, and (b) briefly lists the services offered (see SERVICES below — just the service names, not prices yet). Use "Sir" or "Ma" consistently once they answer (their actual full name will be collected later as part of the service info requirements).
2. Ask what design service they're interested in, or answer if they already said.
3. Tell them the price for that service (see PRICING below — quote exactly, never invent or round a number).
4. Collect the specific information required for that service (see INFO_REQUIREMENTS below). Ask for items naturally, a few at a time is fine — don't interrogate them all in one message. Pictures/logos will arrive as attachments in the chat; acknowledge receipt when they send them.
5. Once everything required has been collected, confirm the full order back to them in a short, reassuring summary, then share the payment details (see PAYMENT_INFO below) and remind them payment confirms commencement and that designs are ready in 1-2 day(s).
6. Once you've shared the payment details for a completed order, call the submit_order tool.

${SERVICES}

${PRICING}

${PAYMENT_INFO}

${INFO_REQUIREMENTS}

RULES:
- Keep replies short and warm, like a real WhatsApp chat (2-4 sentences max, no long paragraphs).
- Always quote prices and payment details exactly as listed above.
- Clients may want more than one service — collect info for each, and share one combined payment total/details once everything is confirmed.
- If a client asks something outside these services, or has a complaint, or explicitly asks for the designer directly, call the flag_uncertain tool.`;

const tools = [
  {
    name: 'submit_order',
    description: 'Call this once payment details have been shared for a client\'s completed order.',
    input_schema: {
      type: 'object',
      properties: {
        address_title: { type: 'string', description: 'Sir or Ma, as the client indicated' },
        full_name: { type: 'string', description: 'Client\'s full name, collected as part of service info' },
        service: { type: 'string', description: 'Which service(s) they ordered' },
        details: { type: 'string', description: 'All collected information for the order, summarized' },
      },
      required: ['address_title', 'full_name', 'service', 'details'],
    },
  },
  {
    name: 'flag_uncertain',
    description: 'Call this when a request falls outside the listed services/pricing, there is a complaint, or the client explicitly asks for the human designer.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Short reason a human should step in' },
      },
      required: ['reason'],
    },
  },
];

/**
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @returns {Promise<{ reply: string|null, event: 'submit_order'|'flag_uncertain'|null, eventDetail: string|null }>}
 */
export async function getBotResponse(history) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: history.map(m => ({ role: m.role, content: m.content })),
    tools,
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  const textBlock = response.content.find(block => block.type === 'text');

  if (toolUse) {
    const detail = toolUse.name === 'submit_order'
      ? `Client: ${toolUse.input.full_name} (${toolUse.input.address_title})\nService: ${toolUse.input.service}\nDetails: ${toolUse.input.details}`
      : toolUse.input.reason;
    return { reply: textBlock ? textBlock.text : null, event: toolUse.name, eventDetail: detail };
  }

  return { reply: textBlock ? textBlock.text : null, event: null, eventDetail: null };
}
