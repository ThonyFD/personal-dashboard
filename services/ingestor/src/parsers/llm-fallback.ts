// LLM fallback parser using Anthropic Claude
import { ParsedTransaction, GmailMessage } from '../types';
import { Logger } from '../utils/logger';
import { z } from 'zod';

// Schema for LLM response validation
const TransactionSchema = z.object({
  type: z.enum(['purchase', 'payment', 'refund', 'withdrawal', 'transfer', 'fee', 'other']),
  channel: z.enum(['card', 'bank_transfer', 'cash', 'mobile_payment', 'other']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  merchant: z.string(),
  date: z.string(), // ISO date string
  cardLast4: z.string().length(4).optional(),
  referenceNumber: z.string().optional(),
  description: z.string().optional(),
});

export class LLMFallbackParser {
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      Logger.warn('LLM fallback disabled - ANTHROPIC_API_KEY not set', {
        event: 'llm_disabled',
      });
    }
  }

  async parse(emailBody: string, _message: GmailMessage): Promise<ParsedTransaction | null> {
    if (!this.enabled) {
      return null;
    }

    const timer = Logger.startTimer();

    try {
      const prompt = this.buildPrompt(emailBody);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { content: Array<{ text: string }> };
      const content = data.content[0].text;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = TransactionSchema.parse(parsed);

      Logger.info('LLM parsing successful', {
        event: 'llm_parse_success',
        duration_ms: timer(),
        provider: 'llm',
      });

      return {
        type: validated.type,
        channel: validated.channel,
        amount: validated.amount,
        currency: validated.currency,
        merchant: validated.merchant,
        date: new Date(validated.date),
        cardLast4: validated.cardLast4,
        referenceNumber: validated.referenceNumber,
        description: validated.description,
      };
    } catch (error) {
      Logger.error('LLM parsing failed', {
        event: 'llm_parse_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private buildPrompt(emailBody: string): string {
    return `You are a financial transaction parser. Extract transaction details from the following email.

Email body:
${emailBody}

Extract the following information and return ONLY a JSON object with this exact structure:
{
  "type": "purchase|payment|refund|withdrawal|transfer|fee|other",
  "channel": "card|bank_transfer|cash|mobile_payment|other",
  "amount": <number>,
  "currency": "USD",
  "merchant": "<merchant name>",
  "date": "<ISO date string>",
  "cardLast4": "<optional 4 digits>",
  "referenceNumber": "<optional reference>",
  "description": "<optional brief description>"
}

Rules:
- Use "USD" as currency for Panama
- Extract merchant name as it appears in the email
- Use today's date if no date found
- Only include cardLast4 if explicitly mentioned
- Return ONLY valid JSON, no additional text`;
  }
}
