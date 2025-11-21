// Parser registry and detector
import { BaseParser } from './base';
import { BACParser } from './bac';
import { BanistmoParser } from './banistmo';
import { BanisiParser } from './banisi';
import { ClaveParser } from './clave';
import { YappyParser } from './yappy';
import { LLMFallbackParser } from './llm-fallback';
import { GmailMessage, ParsedTransaction } from '../types';
import { Logger } from '../utils/logger';

export class ParserRegistry {
  private parsers: BaseParser[];
  private llmFallback: LLMFallbackParser;

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

  async parseEmail(
    emailBody: string,
    message: GmailMessage,
    senderEmail: string,
    subject: string
  ): Promise<{ provider: string; transaction: ParsedTransaction } | null> {
    // Try regex-based parsers first
    for (const parser of this.parsers) {
      if (parser.canParse(message, senderEmail, subject)) {
        const timer = Logger.startTimer();
        try {
          const transaction = parser.parse(emailBody, message);
          if (transaction) {
            Logger.info('Transaction parsed successfully', {
              event: 'transaction_parsed',
              provider: (parser as any).config.name,
              duration_ms: timer(),
            });
            return {
              provider: (parser as any).config.name,
              transaction,
            };
          }
        } catch (error) {
          Logger.error('Parser failed', {
            event: 'parser_failed',
            provider: (parser as any).config.name,
            duration_ms: timer(),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Try LLM fallback if regex parsers didn't match
    Logger.info('Attempting LLM fallback', {
      event: 'llm_fallback_attempt',
      senderEmail,
      subject,
    });

    const transaction = await this.llmFallback.parse(emailBody, message);
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

export { BACParser, BanistmoParser, BanisiParser, ClaveParser, YappyParser };
