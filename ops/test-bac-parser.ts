#!/usr/bin/env tsx
/**
 * Quick test script for BAC parser
 * Tests with the example email from bac.txt
 */

import { readFileSync } from 'fs';
import { BACParser } from '../services/ingestor/src/parsers/bac';
import { GmailMessage } from '../services/ingestor/src/types';

// Read the example email
const emailContent = readFileSync('../bac.txt', 'utf-8');

// Extract just the plain text part (between Content-Type: text/plain and the next boundary)
const plainTextMatch = emailContent.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)\n\n------=/);
const emailBody = plainTextMatch ? plainTextMatch[1] : emailContent;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  BAC Parser Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📧 Email body (first 500 chars):');
console.log(emailBody.substring(0, 500).replace(/\n/g, '\\n'));
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
      { name: 'From', value: 'notificacion_pa@pa.bac.net' },
      { name: 'Subject', value: 'Transaccion Realizada con su Tarjeta BAC Panama' },
    ],
  },
};

// Test the parser
const parser = new BACParser();

console.log('🔍 Testing parser...\n');

const canParse = parser.canParse(
  mockMessage,
  'notificacion_pa@pa.bac.net',
  'Transaccion Realizada con su Tarjeta BAC Panama'
);

console.log(`✓ canParse: ${canParse}`);

if (canParse) {
  const result = parser.parse(emailBody, mockMessage);

  if (result) {
    console.log('\n✅ Parse successful!\n');
    console.log('📊 Extracted transaction:');
    console.log(`   Type: ${result.type}`);
    console.log(`   Channel: ${result.channel}`);
    console.log(`   Amount: ${result.amount} ${result.currency}`);
    console.log(`   Merchant: ${result.merchant}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Card Last 4: ${result.cardLast4 || 'N/A'}`);
    console.log(`   Description: ${result.description}`);
  } else {
    console.log('\n❌ Parse failed - returned null');
    console.log('\nDebugging info:');

    // Test individual extraction methods
    const baseParser = parser as any;

    const amount = baseParser.extractAmount(emailBody);
    console.log(`   Amount extracted: ${amount}`);

    const merchant = baseParser.extractMerchantFromBody(emailBody);
    console.log(`   Merchant extracted: ${merchant}`);

    const date = baseParser.extractDate(emailBody);
    console.log(`   Date extracted: ${date}`);

    const cardLast4 = baseParser.extractCardLast4(emailBody);
    console.log(`   Card last 4: ${cardLast4}`);
  }
} else {
  console.log('\n❌ Parser cannot parse this email');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
