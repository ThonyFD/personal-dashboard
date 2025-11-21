// Gmail Polling Service - Fallback when push notifications fail
import express from 'express';
import { GmailPoller } from './poller';
import { Logger } from './logger';

const app = express();
app.use(express.json());

const poller = new GmailPoller();
let isReady = false;

// Initialize poller on startup
poller
  .initialize()
  .then(() => {
    isReady = true;
    Logger.info('Poller service initialized', { event: 'poller_init' });
  })
  .catch((error) => {
    Logger.error('Failed to initialize poller service', {
      event: 'poller_init_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });

// Health check endpoint
app.get('/health', (_req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'initializing' });
  }
});

// Manual polling trigger endpoint (for testing)
app.post('/poll', async (_req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'Service not ready' });
  }

  try {
    Logger.info('Manual poll request received', { event: 'manual_poll_request' });

    const result = await poller.pollForNewEmails();

    res.status(200).json({
      status: 'success',
      messagesProcessed: result.messagesProcessed,
      lastHistoryId: result.lastHistoryId,
    });
  } catch (error) {
    Logger.error('Manual poll failed', {
      event: 'manual_poll_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Scheduled polling endpoint (called by Cloud Scheduler)
app.post('/scheduled-poll', async (_req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'Service not ready' });
  }

  try {
    Logger.info('Scheduled poll request received', { event: 'scheduled_poll_request' });

    const result = await poller.pollForNewEmails();

    res.status(200).json({
      status: 'success',
      messagesProcessed: result.messagesProcessed,
      lastHistoryId: result.lastHistoryId,
    });
  } catch (error) {
    Logger.error('Scheduled poll failed', {
      event: 'scheduled_poll_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully', { event: 'shutdown' });
  await poller.close();
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  Logger.info(`Gmail poller service listening on port ${PORT}`, {
    event: 'server_start',
    port: PORT,
  });
});