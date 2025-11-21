#!/usr/bin/env npx tsx

/**
 * Backfill script to reprocess emails from the past week
 * This will fetch all emails from Gmail history and process them
 */

import { GmailClient } from './src/gmail/client';
import { DatabaseClient } from './src/database/client';
import { IngestionHandler } from './src/handler';
import { Logger } from './src/utils/logger';

async function main() {
  console.log('🔄 Starting backfill process for the past week...\n');

  const handler = new IngestionHandler();
  const gmailClient = new GmailClient();
  const dbClient = new DatabaseClient();

  // Initialize clients
  await handler.initialize();
  await gmailClient.initialize();

  console.log('✓ Clients initialized\n');

  // Get the current historyId
  const currentHistoryId = await dbClient.getLastHistoryId();
  console.log(`Current historyId in DB: ${currentHistoryId}\n`);

  // Calculate the historyId from a week ago
  // Since we don't have an exact mapping, we'll fetch messages from the past 7 days directly
  console.log('Fetching emails from the past 7 days using Gmail API...\n');

  // Use Gmail API to list messages from the past week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const afterTimestamp = Math.floor(oneWeekAgo.getTime() / 1000);

  const gmail = (gmailClient as any).gmail;

  try {
    // Refresh token before making API call
    await (gmailClient as any).refreshToken();

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterTimestamp}`,
      maxResults: 500,
    });

    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} messages from the past week\n`);

    if (messages.length === 0) {
      console.log('No messages to process. Exiting.');
      return;
    }

    console.log('Processing messages...\n');
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const progress = `[${i + 1}/${messages.length}]`;

      try {
        console.log(`${progress} Processing message ${message.id}...`);

        // Check if message was already processed (by gmailMessageId)
        // We'll just process it anyway and let DB constraints handle duplicates
        await handler.processMessage(message.id);

        successCount++;
        console.log(`${progress} ✓ Success\n`);
      } catch (error: any) {
        if (error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
          skippedCount++;
          console.log(`${progress} ⊘ Skipped (already processed)\n`);
        } else {
          errorCount++;
          console.error(`${progress} ✗ Error: ${error.message}\n`);
        }
      }

      // Add a small delay to avoid rate limiting
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Backfill complete!');
    console.log('='.repeat(60));
    console.log(`Total messages: ${messages.length}`);
    console.log(`✓ Successfully processed: ${successCount}`);
    console.log(`⊘ Skipped (duplicates): ${skippedCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Failed to fetch messages from Gmail:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
