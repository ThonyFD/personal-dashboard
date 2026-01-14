// Gmail Polling Service - Fallback when push notifications fail
import { google, Auth } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { persistTokens } from 'oauth-token-store';
import { Logger } from './logger';

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface PollResult {
  messagesProcessed: number;
  lastHistoryId: string;
}

export class GmailPoller {
  private secretClient: SecretManagerServiceClient;
  private projectId: string;
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;

  constructor(projectId?: string) {
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
    this.secretClient = new SecretManagerServiceClient();
  }

  async initialize(): Promise<void> {
    try {
      Logger.info('Initializing Gmail poller', { event: 'poller_initialize_start' });

      const credentials = await this.getOAuthCredentials();

      this.oauth2Client = new OAuth2Client(
        credentials.clientId,
        credentials.clientSecret,
        'http://localhost'
      );

      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
      });

      await persistTokens(
        {
          refresh_token: credentials.refreshToken,
        },
        { projectId: this.projectId }
      );

      // Persist any token updates locally and to Secret Manager if Google rotates it
      this.oauth2Client.on('tokens', (tokens) => {
        if (!tokens.access_token && !tokens.refresh_token) {
          return;
        }

        persistTokens(
          {
            access_token: tokens.access_token ?? undefined,
            refresh_token: tokens.refresh_token || credentials.refreshToken,
            expiry_date: tokens.expiry_date ?? undefined,
          },
          {
            projectId: this.projectId,
            updateSecretManager: Boolean(tokens.refresh_token),
          }
        ).catch((error) => {
          Logger.error('Failed to persist refreshed tokens', {
            event: 'token_persist_failed',
            error: error instanceof Error ? error.message : String(error),
          });
        });
      });

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client as any });

      Logger.info('Gmail poller initialized successfully', { event: 'poller_initialize_success' });
    } catch (error) {
      Logger.error('Failed to initialize Gmail poller', {
        event: 'poller_initialize_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async pollForNewEmails(): Promise<PollResult> {
    const timer = Logger.startTimer();

    try {
      Logger.info('Starting email polling', { event: 'poll_start' });

      if (!this.gmail) {
        throw new Error('Gmail client not initialized');
      }

      // Get the last processed history ID from database
      // For now, we'll poll the last 24 hours of emails
      const sinceTimestamp = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

      // List messages from the last 24 hours
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: `after:${Math.floor(sinceTimestamp / 1000)}`,
        maxResults: 100, // Limit to avoid processing too many at once
      });

      const messages = messagesResponse.data.messages || [];
      let messagesProcessed = 0;

      Logger.info('Found messages to process', {
        event: 'messages_found',
        messageCount: messages.length,
        sinceTimestamp: new Date(sinceTimestamp).toISOString(),
      });

      // Process each message
      for (const message of messages) {
        try {
          await this.processMessage(message.id);
          messagesProcessed++;
        } catch (error) {
          Logger.error('Failed to process message during poll', {
            event: 'poll_message_failed',
            messageId: message.id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other messages
        }
      }

      // Get the latest history ID
      const profileResponse = await this.gmail.users.getProfile({ userId: 'me' });
      const lastHistoryId = profileResponse.data.historyId || '';

      Logger.info('Email polling completed', {
        event: 'poll_completed',
        messagesProcessed,
        lastHistoryId,
        duration_ms: timer(),
      });

      return {
        messagesProcessed,
        lastHistoryId,
      };
    } catch (error) {
      Logger.error('Email polling failed', {
        event: 'poll_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async processMessage(messageId: string): Promise<void> {
    try {
      Logger.info('Processing message in poller', {
        event: 'poller_message_processing',
        messageId,
      });

      if (!this.gmail) {
        throw new Error('Gmail client not initialized');
      }

      // Get full message
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = messageResponse.data;

      // Extract basic info for logging
      const headers = message.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';

      Logger.info('Message processed by poller', {
        event: 'poller_message_processed',
        messageId,
        subject: subject.substring(0, 100), // Truncate for logging
        from: from.substring(0, 100),
        historyId: message.historyId,
      });

      // TODO: In a real implementation, this would forward the message
      // to the ingestor service for processing, or process it directly
      // For now, we just log that we found it

    } catch (error) {
      Logger.error('Failed to process message in poller', {
        event: 'poller_message_process_failed',
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getOAuthCredentials(): Promise<OAuthCredentials> {
    const [clientId, clientSecret, refreshToken] = await Promise.all([
      this.getSecret('gmail-oauth-client-id'),
      this.getSecret('gmail-oauth-client-secret'),
      this.getSecret('gmail-oauth-refresh-token'),
    ]);

    return { clientId, clientSecret, refreshToken };
  }

  private async getSecret(secretName: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await this.secretClient.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();

    if (!payload) {
      throw new Error(`Secret ${secretName} has no data`);
    }

    return payload;
  }

  async close(): Promise<void> {
    Logger.info('Gmail poller closed', { event: 'poller_closed' });
  }
}
