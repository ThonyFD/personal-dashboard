// Clave (Panama's digital payment system) transaction parser
import { BaseParser, ParserConfig } from './base.js';
import { ParsedTransaction, GmailMessage } from '../types.js';

const CLAVE_CONFIG: ParserConfig = {
  name: 'clave',
  senderPatterns: [/@clave\.com\.pa$/, /@sistemaclave\.com$/],
  subjectPatterns: [/clave/i, /transferencia/i, /pago/i],
  bodyPatterns: [/clave/i],
};

export class ClaveParser extends BaseParser {
  constructor() {
    super(CLAVE_CONFIG);
  }

  parse(emailBody: string, message: GmailMessage): ParsedTransaction | null {
    const amount = this.extractAmount(emailBody);
    if (!amount) return null;

    const merchant = this.extractMerchantFromBody(emailBody);
    const date = this.extractDate(emailBody) || new Date(parseInt(message.internalDate));

    // Determine if it's a transfer or payment
    const isTransfer = /transferencia/i.test(emailBody);
    const type = isTransfer ? 'transfer' : 'payment';

    return {
      type,
      channel: 'mobile_payment',
      amount,
      currency: 'USD',
      merchant: merchant || 'Clave Transfer',
      date: this.normalizeToTimeZone(date),
      timestamp: this.normalizeToTimeZone(date),
      description: `Clave ${type}`,
    };
  }

  private extractMerchantFromBody(text: string): string | null {
    const patterns = [
      /destinatario:\s*([^\n]+)/i,
      /beneficiario:\s*([^\n]+)/i,
      /para:\s*([^\n]+)/i,
      /to:\s*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
