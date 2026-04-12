// Base parser interface for financial transaction extraction
import { ParsedTransaction, GmailMessage } from '../types.js';

export interface ParserConfig {
  name: string;
  senderPatterns: RegExp[];
  subjectPatterns: RegExp[];
  bodyPatterns: RegExp[];
}

// America/Panama is UTC-5 year-round (no DST).
// All email timestamps are local Panama time, so we always attach this offset
// when constructing Date objects from parsed strings. Without it, the Node.js
// runtime (which runs in UTC on Cloud Run) would treat them as UTC, and then
// normalizeToTimeZone would subtract another 5 hours — shifting dates backward.
export const PANAMA_TZ_OFFSET = '-05:00';
const pad = (n: string | number) => String(n).padStart(2, '0');

export abstract class BaseParser {
  protected config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  canParse(_message: GmailMessage, senderEmail: string, subject: string): boolean {
    const senderMatches = this.config.senderPatterns.some((pattern) =>
      pattern.test(senderEmail.toLowerCase())
    );
    const subjectMatches = this.config.subjectPatterns.some((pattern) =>
      pattern.test(subject.toLowerCase())
    );
    return senderMatches || subjectMatches;
  }

  abstract parse(emailBody: string, message: GmailMessage): ParsedTransaction | null;

  protected extractAmount(text: string): number | null {
    const patterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/,
      /USD\s+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
      /B\/\.\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/, // Panama B/.
      /monto[:\s]+(?:USD\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
      /(\d{1,3}(?:,\d{3})*\.\d{2})/, // Must have decimals (more specific)
    ];

    for (const pattern of patterns) {
      const m = pattern.exec(text);
      if (m) {
        const amount = Number.parseFloat(m[1].replaceAll(',', ''));
        if (!Number.isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  protected extractDate(text: string): Date | null {
    // BAC format with time: 2025/11/02-17:06:43  (YYYY/MM/DD-HH:MM:SS)
    let m = /(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2}):(\d{2})/.exec(text);
    if (m) {
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${PANAMA_TZ_OFFSET}`);
      if (!Number.isNaN(d.getTime())) return d;
    }

    // YYYY/MM/DD (date only)
    m = /(\d{4})\/(\d{2})\/(\d{2})/.exec(text);
    if (m) {
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00${PANAMA_TZ_OFFSET}`);
      if (!Number.isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD (date only — lookahead avoids matching inside HH:MM:SS)
    m = /(\d{4})-(\d{2})-(\d{2})(?!T\d|[\d:])/.exec(text);
    if (m) {
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00${PANAMA_TZ_OFFSET}`);
      if (!Number.isNaN(d.getTime())) return d;
    }

    // MM/DD/YYYY or DD/MM/YYYY — assume MM/DD/YYYY (US bank format)
    m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(text);
    if (m) {
      const mm = pad(m[1]);
      const dd = pad(m[2]);
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00${PANAMA_TZ_OFFSET}`);
      if (!Number.isNaN(d.getTime())) return d;
    }

    // English month names: Jan 15, 2025
    m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i.exec(text);
    if (m) {
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const mm = monthMap[m[1].toLowerCase().substring(0, 3)];
      const dd = pad(m[2]);
      const d = new Date(`${m[3]}-${mm}-${dd}T00:00:00${PANAMA_TZ_OFFSET}`);
      if (!Number.isNaN(d.getTime())) return d;
    }

    return null;
  }

  protected extractCardLast4(text: string): string | null {
    const m = /\*{4}(\d{4})|terminada\s+en\s+(\d{4})|ending\s+in\s+(\d{4})/i.exec(text);
    return m ? (m[1] || m[2] || m[3]) : null;
  }

  protected extractMerchant(_text: string): string | null {
    return null;
  }

  protected normalizeToTimeZone(date: Date): Date {
    // Converts a UTC instant to its Panama wall-clock representation.
    // Input MUST be a proper UTC Date (i.e. constructed with an explicit offset).
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});

    return new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
    );
  }
}
