#!/usr/bin/env node

/**
 * Backfill Cloud Run Job
 * Reprocesa emails de la última semana desde Gmail
 */

import { GmailClient } from './gmail/client.js';
import { IngestionHandler } from './handler.js';

async function main() {
  console.log('🔄 Starting Cloud Run backfill job since Dec 14, 2025...\n');

  const handler = new IngestionHandler();
  const gmailClient = new GmailClient();

  // Initialize
  await handler.initialize();
  await gmailClient.initialize();

  console.log('✓ Clients initialized\n');

  // Use Gmail date query format for Dec 14, 2025
  const startDate = '2025/12/14';
  const query = `label:financial after:${startDate}`;

  console.log(`Fetching emails since: ${startDate}\n`);

  const gmail = (gmailClient as any).gmail;

  try {
    // Refresh token before making API call
    await (gmailClient as any).refreshToken();

    // Fetch messages since Dec 14, 2025
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
    });

    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} messages since Dec 14, 2025\n`);

    if (messages.length === 0) {
      console.log('No messages to process. Exiting.');
      process.exit(0);
    }

    console.log('Processing messages...\n');
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const progress = `[${i + 1}/${messages.length}]`;

      try {
        await handler.processMessage(message.id);
        successCount++;

        // Log every 10 messages
        if ((i + 1) % 10 === 0) {
          console.log(`${progress} Processed ${successCount} messages so far...`);
        }
      } catch (error: any) {
        const errorMsg = error.message || String(error);

        if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
          skippedCount++;
        } else {
          errorCount++;
          console.error(`${progress} Error: ${errorMsg}`);
        }
      }

      // Small delay to avoid rate limiting
      if (i < messages.length - 1 && i % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Backfill complete!');
    console.log('='.repeat(60));
    console.log(`Total messages: ${messages.length}`);
    console.log(`✓ Successfully processed: ${successCount}`);
    console.log(`⊘ Skipped (duplicates): ${skippedCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    process.exit(errorCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('Failed to fetch messages from Gmail:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Backfill job failed:', error);
  process.exit(1);
});
