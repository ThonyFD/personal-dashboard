import express from 'express';
import * as admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Firebase Admin — only used for FCM push notifications
admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802',
});

// Supabase — service_role key bypasses RLS
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

interface Logger {
  info(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

const logger: Logger = {
  info(message: string, context?: any) {
    console.log(JSON.stringify({
      severity: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  error(message: string, context?: any) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
};

interface PendingPayment {
  id: number;
  description: string;
  amount: number;
  paymentMethod?: string;
  transactionType?: string;
  notes?: string;
}

interface DayPayments {
  date: Date;
  dayLabel: string;
  dayOffset: number;
  payments: PendingPayment[];
}

interface PushSubscription {
  id: number;
  userEmail: string;
  endpoint: string;
  keys: string; // JSON string
  isActive: boolean;
}

function getDayLabel(i: number, date: Date): string {
  if (i === 0) return 'Hoy';
  if (i === 1) return 'Mañana';
  return date.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' });
}

// Get pending payments for today + next 3 days
async function getPendingPayments(): Promise<DayPayments[]> {
  const now = new Date();
  const panamaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Panama' }));

  const results: DayPayments[] = [];

  for (let i = 0; i <= 3; i++) {
    const date = new Date(panamaTime);
    date.setDate(date.getDate() + i);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const { data, error } = await supabase
      .from('manual_transactions')
      .select('id, description, amount, payment_method, transaction_type, notes')
      .eq('year', year)
      .eq('month', month)
      .eq('day', day)
      .eq('is_paid', false);

    if (error) throw new Error(`Failed to fetch payments for ${year}-${month}-${day}: ${error.message}`);

    const payments: PendingPayment[] = (data ?? []).map((r: any) => ({
      id: r.id,
      description: r.description,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      transactionType: r.transaction_type,
      notes: r.notes,
    }));

    if (payments.length > 0) {
      results.push({ date, dayLabel: getDayLabel(i, date), dayOffset: i, payments });
    }
  }

  return results;
}

// Get all active push subscriptions
async function getActivePushSubscriptions(): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_email, endpoint, keys, is_active')
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch active subscriptions: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    userEmail: r.user_email,
    endpoint: r.endpoint,
    keys: typeof r.keys === 'string' ? r.keys : JSON.stringify(r.keys),
    isActive: r.is_active,
  }));
}

// Deactivate a subscription
async function deactivateSubscription(id: number): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`Failed to deactivate subscription ${id}: ${error.message}`);
}

// Send push notification
async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  subscriptionId: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: 'payment-reminder',
          requireInteraction: true,
        },
        fcmOptions: {
          link: 'https://personal-finantial-dashboard.web.app/monthly-control',
        },
      },
    };

    const messageId = await admin.messaging().send(message);
    return { success: true, messageId };
  } catch (error: any) {
    // Handle invalid tokens
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      logger.info('Invalid token, deactivating subscription', {
        event: 'invalid_token',
        subscriptionId,
      });
      await deactivateSubscription(subscriptionId);
      return { success: false, error: 'invalid_token' };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

// Main function to send payment reminders
async function sendPaymentReminders(): Promise<{
  sentCount: number;
  failedCount: number;
  totalPayments: number;
  totalAmount: number;
}> {
  const timer = Date.now();

  try {
    logger.info('Starting payment reminders job', { event: 'job_start' });

    // 1. Get pending payments
    const pendingDays = await getPendingPayments();

    if (pendingDays.length === 0) {
      logger.info('No pending payments found', { event: 'no_pending_payments' });
      return { sentCount: 0, failedCount: 0, totalPayments: 0, totalAmount: 0 };
    }

    // 2. Calculate totals
    const totalPayments = pendingDays.reduce((sum, day) => sum + day.payments.length, 0);
    const totalAmount = pendingDays.reduce(
      (sum, day) => sum + day.payments.reduce((s, p) => s + p.amount, 0),
      0
    );

    // 3. Build notification message
    const title = `💰 ${totalPayments} pago${totalPayments > 1 ? 's' : ''} pendiente${totalPayments > 1 ? 's' : ''}`;

    let body = `Total: $${totalAmount.toFixed(2)}\n\n`;
    pendingDays.forEach(day => {
      const dayTotal = day.payments.reduce((s, p) => s + p.amount, 0);
      body += `${day.dayLabel}: ${day.payments.length} pago${day.payments.length > 1 ? 's' : ''} ($${dayTotal.toFixed(2)})\n`;
    });
    body += '\nToca para ver detalles';

    logger.info('Pending payments summary', {
      event: 'payments_summary',
      totalPayments,
      totalAmount,
      days: pendingDays.length,
    });

    // 4. Get active subscriptions
    const subscriptions = await getActivePushSubscriptions();
    logger.info(`Found ${subscriptions.length} active subscriptions`, {
      event: 'subscriptions_found',
      count: subscriptions.length,
    });

    if (subscriptions.length === 0) {
      logger.info('No active subscriptions', { event: 'no_subscriptions' });
      return { sentCount: 0, failedCount: 0, totalPayments, totalAmount };
    }

    // 5. Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        // Extract FCM token from keys JSON
        const keys = JSON.parse(sub.keys);
        const fcmToken = keys.fcmToken || sub.endpoint;

        const result = await sendPushNotification(fcmToken, title, body, sub.id);

        if (result.success) {
          sentCount++;
          logger.info('Notification sent successfully', {
            event: 'notification_sent',
            subscriptionId: sub.id,
            userEmail: sub.userEmail,
            messageId: result.messageId,
          });
        } else {
          failedCount++;
          logger.error('Failed to send notification', {
            event: 'notification_failed',
            subscriptionId: sub.id,
            error: result.error,
          });
        }
      } catch (error) {
        failedCount++;
        logger.error('Error sending notification', {
          event: 'notification_error',
          subscriptionId: sub.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duration = Date.now() - timer;
    logger.info('Payment reminders job completed', {
      event: 'job_completed',
      sentCount,
      failedCount,
      totalPayments,
      totalAmount,
      duration_ms: duration,
    });

    return { sentCount, failedCount, totalPayments, totalAmount };
  } catch (error) {
    const duration = Date.now() - timer;
    logger.error('Payment reminders job failed', {
      event: 'job_failed',
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

// Notify endpoint (triggered by Cloud Scheduler)
app.post('/notify', async (req, res) => {
  try {
    logger.info('Notification request received', { event: 'notify_request' });

    const result = await sendPaymentReminders();

    res.status(200).json({
      status: 'success',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      totalPayments: result.totalPayments,
      totalAmount: result.totalAmount,
    });
  } catch (error) {
    logger.error('Notification endpoint failed', {
      event: 'notify_endpoint_failed',
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
  logger.info(`Notifier service listening on port ${PORT}`, {
    event: 'server_start',
    port: PORT,
  });
});
