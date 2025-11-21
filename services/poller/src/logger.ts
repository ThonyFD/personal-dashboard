// Simple logger for poller service
export class Logger {
  static info(message: string, context?: any): void {
    console.log(
      JSON.stringify({
        severity: 'INFO',
        message,
        timestamp: new Date().toISOString(),
        service: 'gmail-poller',
        ...context,
      })
    );
  }

  static error(message: string, context?: any): void {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message,
        timestamp: new Date().toISOString(),
        service: 'gmail-poller',
        ...context,
      })
    );
  }

  static warn(message: string, context?: any): void {
    console.warn(
      JSON.stringify({
        severity: 'WARNING',
        message,
        timestamp: new Date().toISOString(),
        service: 'gmail-poller',
        ...context,
      })
    );
  }

  static startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}