#!/usr/bin/env node
/**
 * Test single Yappy email extraction
 */

import { createRequire } from 'module';
import { GmailClient } from '../src/gmail/client.js';
import { YappyParser } from '../src/parsers/yappy.js';
import { Logger } from '../src/utils/logger.js';
import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  // Set up database connection
  const connectionString = process.env.POSTGRES_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('POSTGRES_CONNECTION_STRING environment variable is required');
  }

  const pool = new Pool({
    connectionString,
    ssl: false,
  });

  try {
    // Get one Yappy email
    const result = await pool.query(`
      SELECT DISTINCT e.id, e.gmail_message_id, e.subject
      FROM emails e
      JOIN transactions t ON t.email_id = e.id
      JOIN merchants m ON t.merchant_id = m.id
      WHERE e.provider = 'yappy'
        AND m.name = 'Yappy Payment'
      ORDER BY e.id
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No Yappy emails found');
      return;
    }

    const email = result.rows[0];
    console.log(`Testing email: ${email.gmail_message_id}`);
    console.log(`Subject: ${email.subject}`);

    // Initialize Gmail client
    const gmailClient = new GmailClient();
    await gmailClient.initialize();

    // Fetch email
    const gmailMessage = await gmailClient.getMessage(email.gmail_message_id);

    // Extract body
    const emailBody = extractEmailBody(gmailMessage);
    console.log('\n=== EMAIL BODY ===');
    console.log(emailBody);
    console.log('\n=== END BODY ===\n');

    // Parse
    const parser = new YappyParser();
    const parsed = parser.parse(emailBody || '', gmailMessage);
    console.log('\n=== PARSED RESULT ===');
    console.log(JSON.stringify(parsed, null, 2));

  } finally {
    await pool.end();
  }
}

/**
 * Extract email body from Gmail message
 */
function extractEmailBody(message: any): string | null {
  try {
    // Try to get the plain text body
    const parts = message.payload?.parts || [message.payload];

    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      // Check nested parts
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
            return Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }

    // Fallback to body.data if no parts
    if (message.payload?.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return null;
  } catch (error) {
    console.error('Error extracting email body:', error);
    return null;
  }
}

main().catch(console.error);
