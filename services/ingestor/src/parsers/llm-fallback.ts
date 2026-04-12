// LLM fallback parser using Google Gemini 2.0 Flash
import { GoogleGenAI, Type } from '@google/genai';
import { ParsedTransaction, GmailMessage } from '../types.js';
import { Logger } from '../utils/logger.js';
import { z } from 'zod';

const MAX_BODY_CHARS = 4000;

// Zod schema for final validation
const TransactionSchema = z.object({
  type: z.enum(['purchase', 'payment', 'refund', 'withdrawal', 'transfer', 'fee', 'income', 'other']),
  channel: z.enum(['card', 'bank_transfer', 'cash', 'mobile_payment', 'other']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  merchant: z.string().min(1),
  date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date string' }),
  cardLast4: z.string().optional(),
  referenceNumber: z.string().optional(),
  description: z.string().optional(),
});

// Gemini responseSchema for structured output
const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ['purchase', 'payment', 'refund', 'withdrawal', 'transfer', 'fee', 'income', 'other'],
    },
    channel: {
      type: Type.STRING,
      enum: ['card', 'bank_transfer', 'cash', 'mobile_payment', 'other'],
    },
    amount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    merchant: { type: Type.STRING },
    date: { type: Type.STRING },
    cardLast4: { type: Type.STRING },
    referenceNumber: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['type', 'channel', 'amount', 'currency', 'merchant', 'date'],
};

export class LLMFallbackParser {
  private readonly client: GoogleGenAI | null;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.enabled = !!apiKey;

    if (this.enabled) {
      this.client = new GoogleGenAI({ apiKey });
    } else {
      this.client = null;
      Logger.warn('LLM fallback disabled - GEMINI_API_KEY not set', {
        event: 'llm_disabled',
      });
    }
  }

  async parse(
    emailBody: string,
    _message: GmailMessage,
    senderEmail: string,
    subject: string
  ): Promise<ParsedTransaction | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    const timer = Logger.startTimer();

    try {
      const cleanBody = this.prepareBody(emailBody);
      const prompt = this.buildPrompt(cleanBody, senderEmail, subject);

      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
        },
      });

      const content = response.text;
      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(content);
      const validated = TransactionSchema.parse(parsed);

      // Normalize cardLast4: strip non-digits, keep last 4
      const cardLast4Raw = validated.cardLast4?.replaceAll(/\D/g, '');
      const cardLast4 = cardLast4Raw && cardLast4Raw.length >= 4
        ? cardLast4Raw.slice(-4)
        : undefined;

      // Parse and normalize date to America/Panama timezone
      const rawDate = new Date(validated.date);
      const txnDate = this.normalizeToTimeZone(rawDate);

      Logger.info('LLM parsing successful', {
        event: 'llm_parse_success',
        duration_ms: timer(),
        provider: 'gemini',
      });

      return {
        type: validated.type,
        channel: validated.channel,
        amount: validated.amount,
        currency: validated.currency,
        merchant: validated.merchant,
        date: txnDate,
        cardLast4,
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

  // Strip HTML tags and collapse whitespace, then truncate
  private prepareBody(emailBody: string): string {
    return emailBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_BODY_CHARS);
  }

  private buildPrompt(cleanBody: string, senderEmail: string, subject: string): string {
    const today = new Date().toISOString().split('T')[0];
    return `You are a financial transaction parser for Panama (timezone: America/Panama).
Today's date is ${today}. Extract transaction details from the email below.

Sender: ${senderEmail}
Subject: ${subject}

Rules:
- Currency is USD (Panama uses USD)
- Extract merchant name as it appears in the email
- Use ${today} as the date if none is found in the email
- Only include cardLast4 if 4 digits are explicitly mentioned
- type: "purchase" for compras, "payment" for bill payments/pagos de servicios, "transfer" for transferencias, "refund" for devoluciones, "income" for incoming money

Email body:
${cleanBody}`;
  }

  // Normalize date to America/Panama timezone (mirrors BaseParser.normalizeToTimeZone)
  private normalizeToTimeZone(date: Date): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

    return new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
    );
  }
}
