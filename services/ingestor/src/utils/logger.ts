// Structured logging utility for Cloud Run
import { LogContext } from '../types.js';

export class Logger {
  private static formatLog(level: string, message: string, context?: LogContext): string {
    const logEntry = {
      severity: level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  static info(message: string, context?: LogContext): void {
    console.log(this.formatLog('INFO', message, context));
  }

  static error(message: string, context?: LogContext): void {
    console.error(this.formatLog('ERROR', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('WARNING', message, context));
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatLog('DEBUG', message, context));
    }
  }

  static startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}
