// Parser registry and detector
import { BaseParser } from './base.js';
import { BACParser } from './bac.js';
import { BanistmoParser } from './banistmo.js';
import { BanisiParser } from './banisi.js';
import { ClaveParser } from './clave.js';
import { YappyParser } from './yappy.js';
import { LLMFallbackParser } from './llm-fallback.js';
import { GmailMessage, ParsedTransaction } from '../types.js';
import { Logger } from '../utils/logger.js';

export class ParserRegistry {
  private readonly parsers: BaseParser[];
  private readonly llmFallback: LLMFallbackParser;

  constructor() {
    this.parsers = [
      new BACParser(),
      new BanistmoParser(),
      new BanisiParser(),
      new ClaveParser(),
      new YappyParser(),
      // Add more parsers here as needed
    ];
    this.llmFallback = new LLMFallbackParser();
  }

  detectProvider(message: GmailMessage, senderEmail: string, subject: string): string | undefined {
    for (const parser of this.parsers) {
      if (parser.canParse(message, senderEmail, subject)) {
        return (parser as any).config.name;
      }
    }
    return undefined;
  }

  // Run the matching regex parser. Returns the parsed result, or 'ignored'
  // when a parser claims the email but flags it as a non-transaction (so the
  // caller skips the LLM fallback), or null when no parser produced a result.
  private tryRegexParsers(
    emailBody: string,
    message: GmailMessage,
    senderEmail: string,
    subject: string
  ): { provider: string; transaction: ParsedTransaction } | 'ignored' | null {
    for (const parser of this.parsers) {
      if (!parser.canParse(message, senderEmail, subject)) continue;

      const provider = (parser as any).config.name;

      // Provider matched but the email is explicitly not a transaction
      // (e.g. a Yappy payment request). Drop it without LLM fallback.
      if (parser.shouldIgnore(emailBody, message, subject)) {
        Logger.info('Email ignored by parser', {
          event: 'email_ignored',
          provider,
          senderEmail,
          subject,
        });
        return 'ignored';
      }

      const timer = Logger.startTimer();
      try {
        const transaction = parser.parse(emailBody, message);
        if (transaction) {
          Logger.info('Transaction parsed successfully', {
            event: 'transaction_parsed',
            provider,
            duration_ms: timer(),
          });
          return { provider, transaction };
        }
      } catch (error) {
        Logger.error('Parser failed', {
          event: 'parser_failed',
          provider,
          duration_ms: timer(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return null;
  }

  async parseEmail(
    emailBody: string,
    message: GmailMessage,
    senderEmail: string,
    subject: string
  ): Promise<{ provider: string; transaction: ParsedTransaction } | null> {
    // Try regex-based parsers first
    const regexResult = this.tryRegexParsers(emailBody, message, senderEmail, subject);
    if (regexResult === 'ignored') return null;
    if (regexResult) return regexResult;

    // Try LLM fallback if regex parsers didn't match
    Logger.info('Attempting LLM fallback', {
      event: 'llm_fallback_attempt',
      senderEmail,
      subject,
    });

    const transaction = await this.llmFallback.parse(emailBody, message, senderEmail, subject);
    if (transaction) {
      return {
        provider: 'llm',
        transaction,
      };
    }

    Logger.warn('No parser matched email and LLM fallback failed', {
      event: 'parse_failed_all',
      senderEmail,
      subject,
    });

    return null;
  }
}

export { BACParser } from './bac.js';
export { BanistmoParser } from './banistmo.js';
export { BanisiParser } from './banisi.js';
export { ClaveParser } from './clave.js';
export { YappyParser } from './yappy.js';
