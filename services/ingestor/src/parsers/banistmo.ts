// Banistmo transaction parser
import { BaseParser, ParserConfig } from './base.js';
import { ParsedTransaction, GmailMessage } from '../types.js';

const BANISTMO_CONFIG: ParserConfig = {
  name: 'banistmo',
  senderPatterns: [/@banistmo\.com$/],
  subjectPatterns: [/notificaciones banistmo/i, /alertas.*banistmo/i],
  bodyPatterns: [/banistmo/i],
};

export class BanistmoParser extends BaseParser {
  constructor() {
    super(BANISTMO_CONFIG);
  }

  parse(emailBody: string, message: GmailMessage): ParsedTransaction | null {
    // Clean up HTML entities and quoted-printable encoding
    const cleanedBody = this.cleanHTML(emailBody);

    const amount = this.extractAmount(cleanedBody);
    if (!amount) return null;

    // Banistmo sends payment confirmations, not purchases
    // Extract merchant/description from the transaction type
    const merchant = this.extractMerchantFromBody(cleanedBody);

    const date = this.extractDate(cleanedBody) || new Date(parseInt(message.internalDate));
    const cardLast4 = this.extractCardLast4(cleanedBody);
    const referenceNumber = this.extractReferenceNumber(cleanedBody);

    // Determine transaction type
    const type = this.detectTransactionType(cleanedBody);

    // Determine channel based on transaction type
    const channel = type === 'purchase' ? 'card' : 'bank_transfer';

    return {
      type,
      channel,
      amount,
      currency: 'USD',
      merchant: merchant || 'Banistmo Payment',
      date: this.normalizeToTimeZone(date),
      timestamp: this.normalizeToTimeZone(date),
      cardLast4: cardLast4 || undefined,
      referenceNumber: referenceNumber || undefined,
      description: `Banistmo ${type}`,
    };
  }

  private cleanHTML(text: string): string {
    const cleaned = text
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      // Decode quoted-printable
      .replace(/=3D/g, '=')  // =3D is encoded =
      .replace(/=C3=A9/g, 'é')
      .replace(/=C3=B3/g, 'ó')
      .replace(/=C3=AD/g, 'í')
      .replace(/=C3=B1/g, 'ñ')
      .replace(/=C3=BA/g, 'ú')
      .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Remove HTML tags but keep content
      .replace(/<[^>]+>/g, ' ')
      // Clean up residual = signs that aren't part of encoding
      .replace(/:=\s/g, ': ')  // Convert ":= " to ": "
      .replace(/=\s/g, ' ')     // Remove other stray = signs
      // Normalize whitespace
      .replace(/\s+/g, ' ');

    return cleaned;
  }

  private detectTransactionType(text: string): 'payment' | 'transfer' | 'purchase' {
    // Credit card payments (manual payments to pay off the card)
    if (/pago.*tarjeta.*cr[eé]dito/i.test(text)) {
      return 'payment';
    }
    // Transfers
    if (/transferencia/i.test(text)) {
      return 'transfer';
    }
    // Purchases (transactions at merchants)
    if (/lugar:/i.test(text) || /transacci[oó]n.*aprobada/i.test(text)) {
      return 'purchase';
    }
    return 'purchase';
  }

  protected override extractAmount(text: string): number | null {
    // Banistmo specific: "Monto: USD 1372.10"
    // Allow up to 7 digits (millions) with optional comma separators and decimals
    const banistmoPattern = /Monto:\s*USD\s+([\d,]+(?:\.\d{1,2})?)/i;
    const match = text.match(banistmoPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    // Fallback to base parser
    return super.extractAmount(text);
  }

  private extractMerchantFromBody(text: string): string | null {
    // Priority 1: Extract merchant name from "Lugar:" field (for purchases)
    // Example: "Lugar: ATHANASIOU CASCO" or "Lugar: <strong>ATHANASIOU CASCO</strong>"
    const lugarPatterns = [
      /Lugar:?\s*(?:<strong>)?([A-Z\s]+?)(?:<\/strong>)?(?:\s*Monto:|\s*<br>)/i,
      /Lugar:?\s*(?:<strong>)?(.+?)(?:<\/strong>)?\s*Monto:/i,
    ];

    for (const pattern of lugarPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const merchant = match[1].trim();
        // Make sure it's not empty and not just spaces
        if (merchant && merchant.length > 0 && !/^\s*$/.test(merchant)) {
          return merchant;
        }
      }
    }

    // Priority 2: Extract card number for credit card payments (from Banca en línea)
    // Banistmo emails usually have "Producto a pagar: *XXXX"
    // After HTML cleaning, it becomes "Producto a pagar *XXXX" or "Producto a pagar: *XXXX"
    // Be specific to avoid catching phone numbers like (507) XXX-XXXX
    const cardPatterns = [
      /Producto\s+a\s+pagar:?\s*\*(\d{4})/i,
      /pagar:?\s*\*(\d{4})/i,
      /tarjeta\s+de\s+cr[eé]dito.*\*(\d{4})/i,
    ];

    for (const pattern of cardPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `Pago Tarjeta *${match[1]}`;
      }
    }

    // Fallback to generic
    if (/pago.*tarjeta.*cr[eé]dito/i.test(text)) {
      return 'Pago de Tarjeta de Crédito';
    }

    return null;
  }

  private extractReferenceNumber(text: string): string | null {
    // Extract reference/transaction number
    const patterns = [
      /n[uú]mero\s+de\s+comprobante.*?:?\s*(\d+)/i,
      /transacci[oó]n:?\s*(\d+)/i,
      /comprobante:?\s*(\d+)/i,
      /referencia:?\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  protected override extractDate(text: string): Date | null {
    // Banistmo format: "30-oct-2025 a las 4:13 pm"
    const datePatterns = [
      /(\d{1,2})-(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)-(\d{4})\s+a\s+las\s+(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /fecha\s+y\s+hora.*?:?\s*(\d{1,2})-(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)-(\d{4})\s+a\s+las\s+(\d{1,2}):(\d{2})\s*(am|pm)/i,
    ];

    const monthMap: Record<string, number> = {
      'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
    };

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const day = parseInt(match[1]);
          const month = monthMap[match[2].toLowerCase()];
          const year = parseInt(match[3]);
          let hour = parseInt(match[4]);
          const minute = parseInt(match[5]);
          const period = match[6].toLowerCase();

          // Convert to 24-hour format
          if (period === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period === 'am' && hour === 12) {
            hour = 0;
          }

          const date = new Date(year, month, day, hour, minute, 0);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch {
          continue;
        }
      }
    }

    // Fallback to base parser
    return super.extractDate(text);
  }
}
