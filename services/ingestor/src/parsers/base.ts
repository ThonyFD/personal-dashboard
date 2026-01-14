// Base parser interface for financial transaction extraction
import { ParsedTransaction, GmailMessage } from '../types.js';

export interface ParserConfig {
  name: string;
  senderPatterns: RegExp[];
  subjectPatterns: RegExp[];
  bodyPatterns: RegExp[];
}

export abstract class BaseParser {
  protected config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  canParse(_message: GmailMessage, senderEmail: string, subject: string): boolean {
    // Check if sender matches
    const senderMatches = this.config.senderPatterns.some((pattern) =>
      pattern.test(senderEmail.toLowerCase())
    );

    // Check if subject matches
    const subjectMatches = this.config.subjectPatterns.some((pattern) =>
      pattern.test(subject.toLowerCase())
    );

    return senderMatches || subjectMatches;
  }

  abstract parse(emailBody: string, message: GmailMessage): ParsedTransaction | null;

  protected extractAmount(text: string): number | null {
    // Common patterns for amounts: $123.45, USD 123.45, 123.45, etc.
    // Made decimals optional to support both "USD 14" and "USD 14.50"
    const patterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/,
      /USD\s+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
      /B\/\.\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/, // Panama B/.
      /monto[:\s]+(?:USD\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
      /(\d{1,3}(?:,\d{3})*\.\d{2})/, // Must have decimals (more specific)
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

    return null;
  }

  protected extractDate(text: string): Date | null {
    // Try to extract date from various formats
    const patterns = [
      // BAC format: 2025/11/02-17:06:43
      /(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2}):(\d{2})/,
      // Standard formats
      /(\d{4})\/(\d{2})\/(\d{2})/,  // YYYY/MM/DD
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // For BAC datetime format YYYY/MM/DD-HH:MM:SS
          if (match[0].includes('-') && match[0].includes(':')) {
            const dateStr = match[0].replace('-', 'T').replace(/\//g, '-');
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }

          // For other formats, let Date constructor parse
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  protected extractCardLast4(text: string): string | null {
    // Allow whitespace/newlines between "terminada en" and digits
    const match = text.match(/\*{4}(\d{4})|terminada\s+en\s+(\d{4})|ending\s+in\s+(\d{4})/i);
    return match ? (match[1] || match[2] || match[3]) : null;
  }

  protected extractMerchant(_text: string): string | null {
    // This is provider-specific and should be overridden
    return null;
  }

  protected normalizeToTimeZone(date: Date): Date {
    // Normalize to America/Panama timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const dateParts: any = {};
    parts.forEach((part) => {
      dateParts[part.type] = part.value;
    });

    return new Date(
      `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
    );
  }
}
