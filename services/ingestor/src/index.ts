// Express server for Cloud Run
import express from 'express';
import cors from 'cors';
import { IngestionHandler } from './handler.js';
import { Logger } from './utils/logger.js';
import { OAuthTokenManager } from './utils/oauth-manager.js';
import { GmailNotification, PubSubMessage } from './types.js';
import monitoringRouter from './monitoring.js';

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for dashboard access

const handler = new IngestionHandler();
const tokenManager = new OAuthTokenManager();
let isReady = false;

// Initialize handler on startup
handler
  .initialize()
  .then(() => {
    isReady = true;
    Logger.info('Server initialized', { event: 'server_init' });
  })
  .catch((error) => {
    Logger.error('Failed to initialize server', {
      event: 'server_init_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });

// Mount monitoring routes
app.use('/monitoring', monitoringRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'initializing' });
  }
});

// OAuth token health check endpoint
app.get('/health/oauth', async (_req, res) => {
  const timer = Logger.startTimer();

  try {
    Logger.info('OAuth health check started', { event: 'oauth_health_check_start' });

    // Try to get a valid access token (will refresh if needed)
    await tokenManager.getAccessToken();

    const expiresIn = tokenManager.getTokenExpiresIn();

    Logger.info('OAuth health check successful', {
      event: 'oauth_health_check_success',
      tokenExpiresIn: expiresIn,
      duration_ms: timer(),
    });

    res.status(200).json({
      status: 'healthy',
      tokenExpiresIn: expiresIn,
      message: 'OAuth token is valid and can be refreshed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isInvalidGrant = errorMessage.includes('invalid_grant');

    Logger.error('OAuth health check failed', {
      event: 'oauth_health_check_failed',
      error: errorMessage,
      isInvalidGrant,
      duration_ms: timer(),
    });

    res.status(503).json({
      status: 'unhealthy',
      error: errorMessage,
      needsManualIntervention: isInvalidGrant,
      message: isInvalidGrant
        ? 'Refresh token is invalid. Manual re-authorization required.'
        : 'Temporary OAuth error. May recover automatically.',
    });
  }
});

// Pub/Sub push endpoint
app.post('/pubsub', async (req, res) => {
  if (!isReady) {
    Logger.warn('Received request while not ready', { event: 'not_ready' });
    return res.status(503).json({ error: 'Service not ready' });
  }

  try {
    const pubsubMessage: PubSubMessage = req.body;

    if (!pubsubMessage.message) {
      Logger.warn('Invalid Pub/Sub message format', { event: 'invalid_message' });
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Decode Pub/Sub message
    const data = Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8');
    const notification: GmailNotification = JSON.parse(data);

    Logger.info('Received Pub/Sub message', {
      event: 'pubsub_received',
      messageId: pubsubMessage.message.messageId,
      historyId: notification.historyId,
    });

    // Process notification asynchronously
    handler.handleNotification(notification).catch((error) => {
      Logger.error('Async notification processing failed', {
        event: 'async_processing_failed',
        messageId: pubsubMessage.message.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Acknowledge immediately (Pub/Sub will retry on failure)
    return res.status(200).json({ status: 'accepted' });
  } catch (error) {
    Logger.error('Failed to process Pub/Sub message', {
      event: 'pubsub_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger endpoint for testing
app.post('/trigger/:messageId', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'Service not ready' });
  }

  const { messageId } = req.params;

  try {
    await handler.processMessage(messageId);
    return res.status(200).json({ status: 'processed', messageId });
  } catch (error) {
    Logger.error('Manual trigger failed', {
      event: 'manual_trigger_failed',
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Processing failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully', { event: 'shutdown' });
  await handler.close();
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  Logger.info(`Server listening on port ${PORT}`, {
    event: 'server_start',
    port: PORT,
  });
});
