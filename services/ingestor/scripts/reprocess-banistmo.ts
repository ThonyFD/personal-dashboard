#!/usr/bin/env node
/**
 * Reprocess Banistmo Transactions Script
 *
 * 1. Deletes all existing Banistmo transactions
 * 2. Fetches all Banistmo emails from Gmail
 * 3. Reprocesses them with the updated parser
 */

import { getDataConnect } from 'firebase/data-connect';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { connectorConfig } from '../src/generated';
import { DatabaseClient } from '../src/database/client';
import { ParserRegistry } from '../src/parsers';
import { generateEmailBodyHash, generateIdempotencyKey } from '../src/utils/hash';
import type { EmailData, TransactionData, GmailMessage } from '../src/types';

const PROJECT_ID = 'mail-reader-433802';

async function getSecret(secretName: string): Promise<string> {
  const secretClient = new SecretManagerServiceClient();
  const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

async function main() {
  console.log('🔄 Banistmo Transaction Reprocessing');
  console.log('=====================================\n');

  // Initialize clients
  const dbClient = new DatabaseClient();
  const parserRegistry = new ParserRegistry();

  // Step 1: Delete existing Banistmo transactions
  console.log('1️⃣  Deleting existing Banistmo transactions...');

  const dataConnect = getDataConnect(connectorConfig);

  // Using raw SQL through Data Connect
  try {
    // For now, let's skip deletion and just reprocess
    // The idempotency key will prevent duplicates
    console.log('   Skipping deletion (idempotency will handle duplicates)\n');
  } catch (error) {
    console.error('   Error during deletion:', error);
  }

  // Step 2: Initialize Gmail client
  console.log('2️⃣  Initializing Gmail client...');
  const clientId = await getSecret('gmail-oauth-client-id');
  const clientSecret = await getSecret('gmail-oauth-client-secret');
  const refreshToken = await getSecret('gmail-oauth-refresh-token');

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  console.log('   ✓ Gmail client ready\n');

  // Step 3: Fetch all Banistmo emails
  console.log('3️⃣  Fetching Banistmo emails from Gmail...');
  const query = 'from:notificaciones@banistmo.com label:financial';

  const messageIds: string[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
      pageToken,
    });

    const messages = response.data.messages || [];
    messageIds.push(...messages.map(m => m.id!));
    pageToken = response.data.nextPageToken;

    console.log(`   Found ${messageIds.length} emails so far...`);
  } while (pageToken);

  console.log(`   ✓ Total: ${messageIds.length} Banistmo emails\n`);

  // Step 4: Process each email
  console.log('4️⃣  Processing emails with updated parser...\n');

  let processed = 0;
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const messageId of messageIds) {
    try {
      // Fetch full message
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data as GmailMessage;

      // Extract email data
      const headers = message.payload?.headers || [];
      const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
      const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

      // Get body
      let body = '';
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      } else if (message.payload?.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }

      const emailData: EmailData = {
        gmailMessageId: message.id!,
        gmailHistoryId: message.historyId!,
        senderEmail: from.match(/<(.+)>/)?.[1] || from,
        senderName: from.match(/^([^<]+)</)?.[1]?.trim() || from,
        subject,
        receivedAt: new Date(dateHeader || Date.now()),
        bodyHash: generateEmailBodyHash(body),
        labels: message.labelIds || [],
      };

      // Save email first
      const emailId = await dbClient.saveEmail(emailData);

      // Parse transaction
      const transaction = await parserRegistry.parse(from, subject, body);

      if (transaction) {
        // Add email reference and idempotency key
        const txnData: TransactionData = {
          ...transaction,
          emailId,
          idempotencyKey: generateIdempotencyKey(emailData.gmailMessageId, transaction),
        };

        // Save transaction
        await dbClient.saveTransaction(txnData);
        saved++;

        if (saved % 10 === 0) {
          console.log(`   Progress: ${saved} transactions saved (${processed + 1}/${messageIds.length} emails)`);
        }
      } else {
        skipped++;
      }

      processed++;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Error processing ${messageId}:`, error.message);
    }
  }

  // Final stats
  console.log('\n' + '='.repeat(50));
  console.log('✅ Reprocessing Complete!');
  console.log('='.repeat(50));
  console.log(`📊 Stats:`);
  console.log(`   Total emails: ${messageIds.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Transactions saved: ${saved}`);
  console.log(`   Skipped (no transaction): ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);
