// BAC (Banco de América Central) transaction parser
import { BaseParser, ParserConfig } from './base.js';
import { ParsedTransaction, GmailMessage } from '../types.js';

const BAC_CONFIG: ParserConfig = {
  name: 'bac',
  senderPatterns: [/@bac\.net$/, /@credomatic\.com$/],
  subjectPatterns: [/compra aprobada/i, /transacci[oó]n aprobada/i, /bac/i],
  bodyPatterns: [/bac/i, /credomatic/i],
};

export class BACParser extends BaseParser {
  constructor() {
    super(BAC_CONFIG);
  }

  parse(emailBody: string, message: GmailMessage): ParsedTransaction | null {
    // Clean up quoted-printable encoding from BAC emails
    const cleanedBody = this.cleanQuotedPrintable(emailBody);

    const amount = this.extractAmount(cleanedBody);
    if (!amount) return null;

    const merchant = this.extractMerchantFromBody(cleanedBody);
    if (!merchant) return null;

    const date = this.extractDate(cleanedBody) || new Date(parseInt(message.internalDate));
    const cardLast4 = this.extractCardLast4(cleanedBody);

    // Determine transaction type
    const isRefund = /reembolso|refund/i.test(cleanedBody);
    const type = isRefund ? 'refund' : 'purchase';

    return {
      type,
      channel: 'card',
      amount,
      currency: 'USD',
      merchant,
      date: this.normalizeToTimeZone(date),
      timestamp: this.normalizeToTimeZone(date),
      cardLast4: cardLast4 || undefined,
      description: `BAC ${type}`,
    };
  }

  private cleanQuotedPrintable(text: string): string {
    return text
      .replace(/=20/g, ' ')   // Replace encoded spaces
      .replace(/=09/g, '\t')  // Replace encoded tabs
      .replace(/=\n/g, '')    // Remove soft line breaks
      .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); // Decode other chars
  }

  private extractMerchantFromBody(text: string): string | null {
    // BAC emails have merchant name before the amount in plain text
    // After cleaning: text already has quoted-printable decoded
    // Format: Comercio\nMonto\nMERCHANT NAME\nUSD 14

    const patterns = [
      // Pattern 1: After "Comercio" and "Monto" headers - most specific first
      /Comercio\s+Monto\s+([A-Z][A-Z0-9\s\-&.,']+?)\s+USD/i,

      // Pattern 2: Traditional format with "Comercio:"
      /comercio:\s*([^\n]+)/i,
      /establecimiento:\s*([^\n]+)/i,
      /merchant:\s*([^\n]+)/i,

      // Pattern 3: Merchant name on line before "USD" amount (but not if it's just "Comercio" or "Monto")
      /(?!Comercio|Monto)([A-Z][A-Z0-9\s\-&.,']{3,}?)\s*[\n\r\s]+USD\s+\d+/i,

      // Pattern 4: Generic - uppercase text before USD amount
      /en\s+([A-Z][A-Z\s&]+?)(?:\s+por|\s+B\/|$)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const merchant = match[1].trim();
        // Clean up merchant name
        const cleaned = merchant
          .replace(/\s+/g, ' ')      // Normalize whitespace
          .trim();

        // Validate it's not just whitespace or too short
        if (cleaned.length > 2) {
          return cleaned;
        }
      }
    }

    return null;
  }
}
