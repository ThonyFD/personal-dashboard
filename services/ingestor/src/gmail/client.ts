// Gmail API client with OAuth
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { OAuthTokenManager } from '../utils/oauth-manager.js';
import { Logger } from '../utils/logger.js';
import { GmailMessage } from '../types.js';

export class GmailClient {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;
  private tokenManager: OAuthTokenManager;

  constructor() {
    this.tokenManager = new OAuthTokenManager();
  }

  async initialize(): Promise<void> {
    // Get an access token (will be automatically refreshed if needed)
    const accessToken = await this.tokenManager.getAccessToken();

    // Create OAuth2 client with the access token
    this.oauth2Client = new google.auth.OAuth2();
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // Set up automatic token refresh before each API call
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        Logger.info('OAuth2 client received new access token', {
          event: 'oauth_token_received',
        });
      }
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    Logger.info('Gmail client initialized with auto-refreshing tokens', {
      event: 'gmail_client_init',
      tokenExpiresIn: this.tokenManager.getTokenExpiresIn(),
    });
  }

  private async refreshToken(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    // Get a fresh access token from the token manager
    const accessToken = await this.tokenManager.getAccessToken();

    // Update the OAuth2 client credentials
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    // Ensure we have a fresh access token
    await this.refreshToken();

    const timer = Logger.startTimer();
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      Logger.info('Gmail message fetched', {
        event: 'gmail_message_fetched',
        messageId,
        duration_ms: timer(),
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch Gmail message', {
        event: 'gmail_fetch_failed',
        messageId,
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listHistory(startHistoryId: string): Promise<any[]> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    // Ensure we have a fresh access token
    await this.refreshToken();

    const timer = Logger.startTimer();
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        labelId: 'INBOX',
        historyTypes: ['messageAdded'],
      });

      Logger.info('Gmail history fetched', {
        event: 'gmail_history_fetched',
        startHistoryId,
        historyCount: response.data.history?.length || 0,
        duration_ms: timer(),
      });

      return response.data.history || [];
    } catch (error) {
      Logger.error('Failed to fetch Gmail history', {
        event: 'gmail_history_failed',
        startHistoryId,
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async setupWatch(topicName: string): Promise<{ historyId: string; expiration: string }> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized');
    }

    // Ensure we have a fresh access token
    await this.refreshToken();

    const timer = Logger.startTimer();
    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: ['INBOX'],
          labelFilterAction: 'include',
        },
      });

      Logger.info('Gmail watch setup', {
        event: 'gmail_watch_setup',
        historyId: response.data.historyId,
        expiration: response.data.expiration,
        duration_ms: timer(),
      });

      return {
        historyId: response.data.historyId,
        expiration: response.data.expiration,
      };
    } catch (error) {
      Logger.error('Failed to setup Gmail watch', {
        event: 'gmail_watch_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  extractEmailBody(message: GmailMessage): string {
    // Extract plain text body from Gmail message
    let body = '';

    function decodeBase64(data: string): string {
      return Buffer.from(data, 'base64').toString('utf-8');
    }

    function extractFromPart(part: any): string {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          const text = extractFromPart(subPart);
          if (text) return text;
        }
      }

      return '';
    }

    // Check main body
    if (message.payload.body?.data) {
      body = decodeBase64(message.payload.body.data);
    }

    // Check parts
    if (!body && message.payload.parts) {
      for (const part of message.payload.parts) {
        body = extractFromPart(part);
        if (body) break;
      }
    }

    return body || message.snippet || '';
  }

  getHeader(message: GmailMessage, headerName: string): string | undefined {
    const header = message.payload.headers.find(
      (h) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value;
  }
}
