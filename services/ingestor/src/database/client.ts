import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger.js';
import { EmailData, TransactionData, MerchantData } from '../types.js';

// Supabase client (service_role key bypasses RLS — safe for backend)
function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export class DatabaseClient {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseClient();
    Logger.info('Supabase client initialized', { event: 'db_init' });
  }

  /**
   * Insert an email record.
   * Returns the inserted ID, or the existing ID on duplicate.
   */
  async insertEmail(data: EmailData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      const { data: row, error } = await this.supabase
        .from('emails')
        .insert({
          gmail_message_id: data.gmailMessageId,
          gmail_history_id: data.gmailHistoryId ? Number.parseInt(data.gmailHistoryId, 10) : null,
          sender_email: data.senderEmail,
          sender_name: data.senderName || null,
          subject: data.subject || null,
          received_at: data.receivedAt.toISOString(),
          body_hash: data.bodyHash,
          labels: data.labels || null,
          provider: data.provider || null,
          parsed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        // 23505 = unique_violation (gmail_message_id already exists)
        if (error.code === '23505') {
          Logger.warn('Email already exists, fetching existing ID', {
            event: 'email_duplicate',
            gmailMessageId: data.gmailMessageId,
          });

          const { data: existing } = await this.supabase
            .from('emails')
            .select('id')
            .eq('gmail_message_id', data.gmailMessageId)
            .single();

          return existing?.id ?? -1;
        }
        throw error;
      }

      Logger.info('Email inserted', {
        event: 'email_inserted',
        duration_ms: timer(),
        emailId: row.id,
        gmailMessageId: data.gmailMessageId,
      });

      return row.id;

    } catch (error) {
      Logger.error('Failed to insert email', {
        event: 'email_insert_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get existing merchant by normalized name, or create it.
   * Returns the merchant ID.
   */
  async getOrCreateMerchant(data: MerchantData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      // Look for existing merchant
      const { data: existing } = await this.supabase
        .from('merchants')
        .select('id')
        .eq('normalized_name', data.normalizedName)
        .maybeSingle();

      if (existing) {
        Logger.info('Merchant found', {
          event: 'merchant_found',
          duration_ms: timer(),
          merchantId: existing.id,
          normalizedName: data.normalizedName,
        });
        return existing.id;
      }

      // Insert new merchant
      const { data: row, error } = await this.supabase
        .from('merchants')
        .insert({
          name: data.name,
          normalized_name: data.normalizedName,
          category_id: data.categoryId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        // Race condition: another request created the merchant between our check and insert
        if (error.code === '23505') {
          Logger.warn('Merchant duplicate detected, querying for existing ID', {
            event: 'merchant_duplicate',
            normalizedName: data.normalizedName,
          });

          const { data: retry } = await this.supabase
            .from('merchants')
            .select('id')
            .eq('normalized_name', data.normalizedName)
            .single();

          if (retry) return retry.id;
          throw new Error(`Merchant duplicate detected but not found: ${data.normalizedName}`);
        }
        throw error;
      }

      Logger.info('Merchant created', {
        event: 'merchant_created',
        duration_ms: timer(),
        merchantId: row.id,
        normalizedName: data.normalizedName,
      });

      return row.id;

    } catch (error) {
      Logger.error('Failed to create merchant', {
        event: 'merchant_create_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Insert a transaction.
   * Returns the inserted ID, or -1 on duplicate (idempotency_key conflict).
   */
  async insertTransaction(data: TransactionData): Promise<number> {
    const timer = Logger.startTimer();

    try {
      const { data: row, error } = await this.supabase
        .from('transactions')
        .insert({
          email_id: data.emailId,
          merchant_id: data.merchantId || null,
          txn_type: data.txnType.toUpperCase(),
          channel: data.channel.toUpperCase(),
          amount: data.amount,
          currency: data.currency || 'USD',
          merchant_name: data.merchantName || null,
          merchant_raw: data.merchantRaw || null,
          txn_date: data.txnDate.toISOString().split('T')[0],
          txn_timestamp: data.txnTimestamp?.toISOString() || null,
          card_last4: data.cardLast4 || null,
          account_last4: data.accountLast4 || null,
          provider: data.provider,
          reference_number: data.referenceNumber || null,
          description: data.description || null,
          notes: data.notes || null,
          idempotency_key: data.idempotencyKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          Logger.warn('Transaction already exists (duplicate)', {
            event: 'duplicate_transaction',
            idempotencyKey: data.idempotencyKey,
          });
          return -1;
        }
        throw error;
      }

      Logger.info('Transaction inserted', {
        event: 'transaction_inserted',
        duration_ms: timer(),
        transactionId: row.id,
        idempotencyKey: data.idempotencyKey,
        amount: data.amount,
        merchant: data.merchantName,
      });

      return row.id;

    } catch (error) {
      Logger.error('Failed to insert transaction', {
        event: 'transaction_insert_failed',
        duration_ms: timer(),
        idempotencyKey: data.idempotencyKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Mark an email as parsed.
   */
  async markEmailParsed(emailId: number): Promise<void> {
    const timer = Logger.startTimer();

    try {
      const { error } = await this.supabase
        .from('emails')
        .update({ parsed: true })
        .eq('id', emailId);

      if (error) throw error;

      Logger.info('Email marked as parsed', {
        event: 'email_marked_parsed',
        duration_ms: timer(),
        emailId,
      });

    } catch (error) {
      Logger.error('Failed to mark email as parsed', {
        event: 'email_mark_parsed_failed',
        duration_ms: timer(),
        emailId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the last processed Gmail historyId.
   */
  async getLastHistoryId(): Promise<string | null> {
    const timer = Logger.startTimer();

    try {
      const { data, error } = await this.supabase
        .from('gmail_sync_state')
        .select('last_history_id, last_synced_at')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Logger.warn('Gmail sync state not found', { event: 'sync_state_not_found' });
        return null;
      }

      const historyId = String(data.last_history_id);
      Logger.info('Retrieved last historyId', {
        event: 'get_last_history_id',
        historyId,
        lastSyncedAt: data.last_synced_at,
        duration_ms: timer(),
      });

      return historyId;

    } catch (error) {
      Logger.error('Failed to get last historyId', {
        event: 'get_last_history_id_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update the last processed Gmail historyId.
   */
  async updateLastHistoryId(historyId: string, watchExpiration?: string): Promise<void> {
    const timer = Logger.startTimer();

    try {
      const { error } = await this.supabase
        .from('gmail_sync_state')
        .upsert({
          id: 1,
          last_history_id: Number.parseInt(historyId, 10),
          last_synced_at: new Date().toISOString(),
          watch_expiration: watchExpiration || null,
        }, { onConflict: 'id' });

      if (error) throw error;

      Logger.info('Updated last historyId', {
        event: 'update_last_history_id',
        historyId,
        watchExpiration,
        duration_ms: timer(),
      });

    } catch (error) {
      Logger.error('Failed to update last historyId', {
        event: 'update_last_history_id_failed',
        duration_ms: timer(),
        historyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get email statistics for monitoring.
   */
  async getEmailStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    latestReceivedAt: string | null;
  }> {
    const timer = Logger.startTimer();
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [totalResult, last24hResult, last7dResult, latestResult] = await Promise.all([
        this.supabase.from('emails').select('*', { count: 'exact', head: true }),
        this.supabase.from('emails').select('*', { count: 'exact', head: true }).gte('received_at', oneDayAgo),
        this.supabase.from('emails').select('*', { count: 'exact', head: true }).gte('received_at', sevenDaysAgo),
        this.supabase.from('emails').select('received_at').order('received_at', { ascending: false }).limit(1),
      ]);

      const total = totalResult.count ?? 0;
      const last24h = last24hResult.count ?? 0;
      const last7d = last7dResult.count ?? 0;
      const latestReceivedAt = latestResult.data?.[0]?.received_at ?? null;

      Logger.info('Email stats retrieved', {
        event: 'get_email_stats',
        duration_ms: timer(),
        total, last24h, last7d,
      });

      return { total, last24h, last7d, latestReceivedAt };

    } catch (error) {
      Logger.error('Failed to get email stats', {
        event: 'get_email_stats_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get transaction statistics for monitoring.
   */
  async getTransactionStats(): Promise<{
    total: number;
    last24h: number;
    last7d: number;
    latestDate: string | null;
  }> {
    const timer = Logger.startTimer();
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [totalResult, last24hResult, last7dResult, latestResult] = await Promise.all([
        this.supabase.from('transactions').select('*', { count: 'exact', head: true }),
        this.supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('txn_date', oneDayAgo),
        this.supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('txn_date', sevenDaysAgo),
        this.supabase.from('transactions').select('txn_date').order('txn_date', { ascending: false }).limit(1),
      ]);

      const total = totalResult.count ?? 0;
      const last24h = last24hResult.count ?? 0;
      const last7d = last7dResult.count ?? 0;
      const latestDate = latestResult.data?.[0]?.txn_date ?? null;

      Logger.info('Transaction stats retrieved', {
        event: 'get_transaction_stats',
        duration_ms: timer(),
        total, last24h, last7d,
      });

      return { total, last24h, last7d, latestDate };

    } catch (error) {
      Logger.error('Failed to get transaction stats', {
        event: 'get_transaction_stats_failed',
        duration_ms: timer(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    Logger.info('Database client closed', { event: 'db_close' });
  }
}
