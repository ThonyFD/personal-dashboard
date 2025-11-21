// Gmail watch renewal service
import express from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const app = express();
app.use(express.json());

const secretClient = new SecretManagerServiceClient();

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface Logger {
  info(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

const logger: Logger = {
  info(message: string, context?: any) {
    console.log(
      JSON.stringify({
        severity: 'INFO',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
  error(message: string, context?: any) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  },
};

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();

  if (!payload) {
    throw new Error(`Secret ${secretName} has no data`);
  }

  return payload;
}

async function getOAuthCredentials(): Promise<OAuthCredentials> {
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getSecret('gmail-oauth-client-id'),
    getSecret('gmail-oauth-client-secret'),
    getSecret('gmail-oauth-refresh-token'),
  ]);

  return { clientId, clientSecret, refreshToken };
}

async function renewGmailWatch(): Promise<{ historyId: string; expiration: string }> {
  const timer = Date.now();

  try {
    const credentials = await getOAuthCredentials();

    const oauth2Client = new OAuth2Client(
      credentials.clientId,
      credentials.clientSecret,
      'http://localhost'
    );

    oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const topicName = `projects/${projectId}/topics/gmail-notifications`;

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
        labelFilterAction: 'include',
      },
    });

    const duration = Date.now() - timer;

    logger.info('Gmail watch renewed successfully', {
      event: 'watch_renewed',
      historyId: response.data.historyId,
      expiration: response.data.expiration,
      duration_ms: duration,
    });

    return {
      historyId: response.data.historyId || '',
      expiration: response.data.expiration || '',
    };
  } catch (error) {
    const duration = Date.now() - timer;
    logger.error('Failed to renew Gmail watch', {
      event: 'watch_renewal_failed',
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Renewal endpoint (triggered by Cloud Scheduler)
app.post('/renew', async (req, res) => {
  try {
    logger.info('Renewal request received', { event: 'renewal_request' });

    const result = await renewGmailWatch();

    res.status(200).json({
      status: 'success',
      historyId: result.historyId,
      expiration: result.expiration,
    });
  } catch (error) {
    logger.error('Renewal endpoint failed', {
      event: 'renewal_endpoint_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down', { event: 'shutdown' });
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`Renewal service listening on port ${PORT}`, {
    event: 'server_start',
    port: PORT,
  });
});
