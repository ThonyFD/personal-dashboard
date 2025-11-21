#!/usr/bin/env tsx
/**
 * Quick test script for Banistmo parser
 * Tests with the example email from banistmo.txt
 */

import { readFileSync } from 'fs';
import { BanistmoParser } from '../services/ingestor/src/parsers/banistmo';
import { GmailMessage } from '../services/ingestor/src/types';

// Read the example email
const emailContent = readFileSync('../banistmo.txt', 'utf-8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Banistmo Parser Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📧 Email body (first 500 chars):');
console.log(emailContent.substring(0, 500).replace(/\n/g, '\\n'));
console.log('...\n');

// Create a mock Gmail message
const mockMessage: GmailMessage = {
  id: 'test-123',
  threadId: 'thread-123',
  labelIds: ['INBOX'],
  snippet: 'Test',
  historyId: '12345',
  internalDate: String(Date.now()),
  payload: {
    headers: [
      { name: 'From', value: 'notificaciones@banistmo.com' },
      { name: 'Subject', value: 'Notificaciones Banistmo' },
    ],
  },
};

// Test the parser
const parser = new BanistmoParser();

console.log('🔍 Testing parser...\n');

const canParse = parser.canParse(
  mockMessage,
  'notificaciones@banistmo.com',
  'Notificaciones Banistmo'
);

console.log(`✓ canParse: ${canParse}`);

if (canParse) {
  // Debug: show cleaned body
  const cleanedBody = (parser as any).cleanHTML(emailContent);
  const productMatch = cleanedBody.match(/pagar.*?(\*\d{4}|2627)/i);
  console.log(`\nDebug - Looking for product number:`);
  console.log(`   Found in cleaned body: ${productMatch ? productMatch[0] : 'NOT FOUND'}`);
  console.log(`   Cleaned body sample (chars 2000-2200): ${cleanedBody.substring(2000, 2200)}\n`);

  const result = parser.parse(emailContent, mockMessage);

  if (result) {
    console.log('\n✅ Parse successful!\n');
    console.log('📊 Extracted transaction:');
    console.log(`   Type: ${result.type}`);
    console.log(`   Channel: ${result.channel}`);
    console.log(`   Amount: ${result.amount} ${result.currency}`);
    console.log(`   Merchant: ${result.merchant}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Card Last 4: ${result.cardLast4 || 'N/A'}`);
    console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
    console.log(`   Description: ${result.description}`);
  } else {
    console.log('\n❌ Parse failed - returned null');
    console.log('\nDebugging info:');

    // Test individual extraction methods
    const baseParser = parser as any;

    const cleanedBody = baseParser.cleanHTML(emailContent);
    console.log(`   Cleaned body (first 300 chars): ${cleanedBody.substring(0, 300)}`);

    const amount = baseParser.extractAmount(cleanedBody);
    console.log(`   Amount extracted: ${amount}`);

    const merchant = baseParser.extractMerchantFromBody(cleanedBody);
    console.log(`   Merchant extracted: ${merchant}`);

    const date = baseParser.extractDate(cleanedBody);
    console.log(`   Date extracted: ${date}`);

    const reference = baseParser.extractReferenceNumber(cleanedBody);
    console.log(`   Reference extracted: ${reference}`);
  }
} else {
  console.log('\n❌ Parser cannot parse this email');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
