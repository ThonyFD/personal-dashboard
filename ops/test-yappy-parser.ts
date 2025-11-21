#!/usr/bin/env tsx
/**
 * Quick test script for Yappy parser
 * Tests with the example email from yappy.txt
 */

import { readFileSync } from 'fs';
import { YappyParser } from '../services/ingestor/src/parsers/yappy';
import { GmailMessage } from '../services/ingestor/src/types';

// Read the example email
const emailContent = readFileSync('../yappy.txt', 'utf-8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Yappy Parser Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📧 Email body:');
console.log(emailContent);
console.log('\n');

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
      { name: 'From', value: 'notifications@yappy.com.pa' },
      { name: 'Subject', value: '¡Enviaste un Yappy! 💸' },
    ],
  },
};

// Test the parser
const parser = new YappyParser();

console.log('🔍 Testing parser...\n');

const canParse = parser.canParse(
  mockMessage,
  'notifications@yappy.com.pa',
  '¡Enviaste un Yappy! 💸'
);

console.log(`✓ canParse: ${canParse}`);

if (canParse) {
  const result = parser.parse(emailContent, mockMessage);

  if (result) {
    console.log('\n✅ Parse successful!\n');
    console.log('📊 Extracted transaction:');
    console.log(`   Type: ${result.type} (should be "transfer" for send/debit)`);
    console.log(`   Channel: ${result.channel}`);
    console.log(`   Amount: ${result.amount} ${result.currency}`);
    console.log(`   Merchant/Recipient: ${result.merchant}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
    console.log(`   Description: ${result.description}`);

    console.log('\n🎯 Expected values:');
    console.log('   Type: transfer (send/debit)');
    console.log('   Amount: 80 USD');
    console.log('   Merchant: Binyu Xie (61944111)');
    console.log('   Reference: BIKEM-75792146');
    console.log('   Date: 02 nov 2025 06:17 p. m.');
    console.log('   Description: Yappy Send (Debit)');

    // Validation
    console.log('\n📋 Validation:');
    console.log(`   ✓ Amount: ${result.amount === 80 ? '✅' : '❌'} (${result.amount})`);
    console.log(`   ✓ Type: ${result.type === 'transfer' ? '✅' : '❌'} (${result.type})`);
    console.log(
      `   ✓ Merchant: ${result.merchant?.includes('Binyu Xie') ? '✅' : '❌'} (${result.merchant})`
    );
    console.log(
      `   ✓ Reference: ${result.referenceNumber === 'BIKEM-75792146' ? '✅' : '❌'} (${result.referenceNumber})`
    );
    console.log(
      `   ✓ Description: ${result.description === 'Yappy Send (Debit)' ? '✅' : '❌'} (${result.description})`
    );
  } else {
    console.log('\n❌ Parse failed - returned null');
    console.log('\nDebugging info:');

    // Test individual extraction methods
    const baseParser = parser as any;

    const amount = baseParser.extractAmount(emailContent);
    console.log(`   Amount extracted: ${amount}`);

    const date = baseParser.extractDate(emailContent);
    console.log(`   Date extracted: ${date}`);

    const reference = baseParser.extractReference(emailContent);
    console.log(`   Reference: ${reference}`);
  }
} else {
  console.log('\n❌ Parser cannot parse this email');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
