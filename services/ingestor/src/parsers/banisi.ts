// Banisi (loan payments and banking notifications) parser
import { BaseParser, ParserConfig } from './base.js';
import { ParsedTransaction, GmailMessage } from '../types.js';

const BANISI_CONFIG: ParserConfig = {
  name: 'banisi',
  senderPatterns: [/@banisipanama\.com$/],
  subjectPatterns: [
    /confirmaci[oó]n\s+de\s+pago/i,
    /pago\s+a\s+pr[eé]stamo/i,
    /banisi/i,
  ],
  bodyPatterns: [/banisi/i, /pago\s+a\s+pr[eé]stamo/i],
};

export class BanisiParser extends BaseParser {
  constructor() {
    super(BANISI_CONFIG);
  }

  parse(emailBody: string, message: GmailMessage): ParsedTransaction | null {
    const cleanedBody = this.cleanHTML(emailBody);
    const amount = this.extractAmount(cleanedBody);

    if (!amount) return null;

    const merchant = this.extractMerchantFromBody(cleanedBody);
    const date = this.extractDate(cleanedBody) || new Date(parseInt(message.internalDate));
    const referenceNumber = this.extractReference(cleanedBody);
    const type = this.detectTransactionType(cleanedBody);

    return {
      type,
      channel: 'bank_transfer', // Débito automático a cuenta
      amount,
      currency: 'USD',
      merchant: merchant || 'Banisi Payment',
      date: this.normalizeToTimeZone(date),
      timestamp: this.normalizeToTimeZone(date),
      referenceNumber: referenceNumber || undefined,
      description: `Banisi ${merchant || 'Payment'}`,
    };
  }

  private cleanHTML(text: string): string {
    // First decode quoted-printable encoding
    let cleaned = text
      .replace(/=20/g, ' ')
      .replace(/=09/g, '\t')
      .replace(/=\n/g, '')
      .replace(/=3D/g, '=')
      .replace(/=E9/g, 'é')
      .replace(/=F3/g, 'ó')
      .replace(/=FA/g, 'ú')
      .replace(/=ED/g, 'í')
      .replace(/=E1/g, 'á')
      .replace(/=F1/g, 'ñ')
      .replace(/=BF/g, '¿')
      .replace(/=A1/g, '¡')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // Clean up multiple spaces and special artifacts
    cleaned = cleaned
      .replace(/:=\s/g, ': ')
      .replace(/=\s/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  private detectTransactionType(text: string): 'payment' | 'transfer' | 'purchase' | 'refund' {
    // Banisi emails are primarily loan payments
    if (/pago\s+a\s+pr[eé]stamo/i.test(text)) {
      return 'payment';
    }

    if (/d[eé]bito\s+autom[aá]tico/i.test(text)) {
      return 'payment';
    }

    if (/transferencia/i.test(text)) {
      return 'transfer';
    }

    return 'payment';
  }

  protected override extractAmount(text: string): number | null {
    // Banisi specific patterns
    // Pattern: "$436.93" or "Cuota Mensual: $436.93"
    const patterns = [
      /\$\s*([\d,]+(?:\.\d{1,2})?)/,
      /cuota\s+mensual:\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    // Fallback to base parser
    return super.extractAmount(text);
  }

  private extractMerchantFromBody(text: string): string | null {
    // Look for loan payment indicator or account debit
    if (/pago\s+a\s+pr[eé]stamo/i.test(text)) {
      // Extract loan number if available
      const loanMatch = text.match(/n[uú]mero\s+de\s+pr[eé]stamo:\s*([\d-]+)/i);
      if (loanMatch) {
        return `Loan Payment ${loanMatch[1]}`;
      }
      return 'Loan Payment';
    }

    if (/d[eé]bito\s+autom[aá]tico\s+a\s+cuenta/i.test(text)) {
      return 'Automatic Debit';
    }

    return null;
  }

  private extractReference(text: string): string | null {
    // Pattern for "Número de Comprobante: 76751297"
    const patterns = [
      /n[uú]mero\s+de\s+comprobante:\s*(\d+)/i,
      /comprobante:\s*(\d+)/i,
      /referencia:\s*([A-Z0-9-]+)/i,
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
    // Banisi date format: "Fecha: 06-10-2025 Hora: 7:47:26 p.m." or "7:47:26 p. m."
    const dateTimePattern = /fecha:\s*(\d{2})-(\d{2})-(\d{4})\s+hora:\s*(\d{1,2}):(\d{2}):(\d{2})\s+(a\.\s*m\.|p\.\s*m\.)/i;
    const match = text.match(dateTimePattern);

    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(match[3]);
      let hour = parseInt(match[4]);
      const minute = parseInt(match[5]);
      const second = parseInt(match[6]);
      const isPM = /p\.\s*m\./i.test(match[7]);

      // Convert to 24-hour format
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (!isPM && hour === 12) {
        hour = 0;
      }

      return new Date(year, month, day, hour, minute, second);
    }

    // Try date-only pattern: "06-10-2025"
    const datePattern = /(\d{2})-(\d{2})-(\d{4})/;
    const dateMatch = text.match(datePattern);

    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = parseInt(dateMatch[3]);
      return new Date(year, month, day);
    }

    // Fallback to base parser
    return super.extractDate(text);
  }
}
