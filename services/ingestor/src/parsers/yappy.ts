// Yappy (Banco General mobile payment) transaction parser
import { BaseParser, ParserConfig } from './base';
import { ParsedTransaction, GmailMessage } from '../types';

const YAPPY_CONFIG: ParserConfig = {
  name: 'yappy',
  senderPatterns: [/@yappy\.com\.pa$/, /@bancogeneral\.com$/],
  subjectPatterns: [/yappy/i, /pago realizado/i, /transferencia/i],
  bodyPatterns: [/yappy/i],
};

export class YappyParser extends BaseParser {
  constructor() {
    super(YAPPY_CONFIG);
  }

  parse(emailBody: string, message: GmailMessage): ParsedTransaction | null {
    const amount = this.extractAmount(emailBody);
    if (!amount) return null;

    // Extract subject from message headers
    const subject = this.getSubject(message);

    // Determine transaction direction (send = debit, receive = credit)
    const isSend = this.isOutgoingTransaction(emailBody, subject);
    const isReceive = this.isIncomingTransaction(emailBody, subject);

    // Extract merchant/recipient based on direction
    const merchant = this.extractMerchantFromBody(emailBody, isSend);
    const date = this.extractDate(emailBody) || new Date(parseInt(message.internalDate));
    const referenceNumber = this.extractReference(emailBody);

    // Set transaction type based on direction
    // Send = transfer (debit), Receive = payment (credit)
    const type = isSend ? 'transfer' : 'payment';

    return {
      type,
      channel: 'mobile_payment',
      amount,
      currency: 'USD',
      merchant: merchant || 'Yappy Payment',
      date: this.normalizeToTimeZone(date),
      timestamp: this.normalizeToTimeZone(date),
      referenceNumber: referenceNumber || undefined,
      description: isSend ? 'Yappy Send (Debit)' : isReceive ? 'Yappy Receive (Credit)' : 'Yappy Payment',
    };
  }

  private getSubject(message: GmailMessage): string {
    const subjectHeader = message.payload?.headers?.find(
      (h) => h.name.toLowerCase() === 'subject'
    );
    return subjectHeader?.value || '';
  }

  private isOutgoingTransaction(emailBody: string, subject: string): boolean {
    // Check subject line for "Enviaste" (You sent)
    const subjectIndicators = /enviaste\s+un\s+yappy|yappy\s+enviado/i;

    // Check body for send indicators
    const bodyIndicators = /enviaste|pagaste\s+a|transferiste\s+a/i;

    return subjectIndicators.test(subject) || bodyIndicators.test(emailBody);
  }

  private isIncomingTransaction(emailBody: string, subject: string): boolean {
    // Check subject line for "Recibiste" (You received)
    const subjectIndicators = /recibiste\s+un\s+yappy|yappy\s+recibido/i;

    // Check body for receive indicators
    const bodyIndicators = /recibiste|te\s+pagaron|te\s+enviaron/i;

    return subjectIndicators.test(subject) || bodyIndicators.test(emailBody);
  }

  private extractMerchantFromBody(text: string, isSend: boolean): string | null {
    // For send transactions, look for recipient name and phone
    // Format: "A: Binyu Xie (61944111)" or "Enviaste a: Binyu Xie"
    const patterns = isSend
      ? [
          // Pattern for "A: Name (Phone)" - most common format
          /^A:\s*([^(]+)\s*\((\d{8})\)/im,
          // Pattern for multiline "A: Name\n(Phone)"
          /^A:\s*(.+?)$/im,
          // Pattern for "Name (Phone)" anywhere
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\((\d{8})\)/,
          // Pattern for "Enviaste a: Name"
          /enviaste\s+a:\s*([^\n]+)/i,
          // Pattern for "Para: Name"
          /para:\s*([^\n(]+)/i,
        ]
      : [
          // For receive transactions, look for sender name with "De:"
          /^De:\s*([^(]+)\s*\((\d{8})\)/im,
          /^De:\s*(.+?)$/im,
          // Generic patterns
          /(?:de|from):\s*([^\n]+)/i,
          /recibiste\s+de:\s*([^\n]+)/i,
          /enviado\s+por:\s*([^\n]+)/i,
        ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // For name-phone pattern, combine both
        if (match[2]) {
          const name = match[1].trim();
          const phone = match[2];
          return `${name} (${phone})`;
        }
        // For other patterns, check if there's a phone number after the match
        if (match[1]) {
          let merchant = match[1].trim();

          // Check if there's a phone number on the next part
          const phoneMatch = text.match(new RegExp(
            merchant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\((\\d{8})\\)',
            'i'
          ));

          if (phoneMatch && phoneMatch[1]) {
            return `${merchant} (${phoneMatch[1]})`;
          }

          // Clean up common artifacts
          const cleaned = merchant
            .replace(/\s+/g, ' ')
            .replace(/[:\n\r]+$/, '')
            .trim();

          if (cleaned.length > 2) {
            return cleaned;
          }
        }
      }
    }

    return null;
  }

  private extractReference(text: string): string | null {
    // Patterns for Yappy reference numbers
    // Examples: "BIKEM-75792146" or "Confirmación: BIKEM-75792146"
    const patterns = [
      /confirmaci[oó]n:\s*([A-Z0-9-]+)/i,
      /(?:ref|referencia|reference)[:\s#]*([A-Z0-9-]+)/i,
      /\b([A-Z]{5}-\d{8})\b/, // Pattern like BIKEM-75792146
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  protected override extractDate(text: string): Date | null {
    // Yappy specific date format: "02 nov 2025 06:17 p. m."
    const yappyDatePattern = /(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(a\.\s*m\.|p\.\s*m\.)/i;
    const match = text.match(yappyDatePattern);

    if (match) {
      const monthMap: Record<string, number> = {
        ene: 0,
        feb: 1,
        mar: 2,
        abr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        ago: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dic: 11,
      };

      const day = parseInt(match[1]);
      const month = monthMap[match[2].toLowerCase()];
      const year = parseInt(match[3]);
      let hour = parseInt(match[4]);
      const minute = parseInt(match[5]);
      const isPM = /p\.\s*m\./i.test(match[6]);

      // Convert to 24-hour format
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (!isPM && hour === 12) {
        hour = 0;
      }

      return new Date(year, month, day, hour, minute, 0);
    }

    // Fallback to base parser
    return super.extractDate(text);
  }
}
