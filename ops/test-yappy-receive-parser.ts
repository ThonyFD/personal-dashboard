#!/usr/bin/env tsx
/**
 * Test script for Yappy RECEIVE parser
 * Tests incoming payment (credit) transactions
 */

import { readFileSync } from 'fs';
import { YappyParser } from '../services/ingestor/src/parsers/yappy';
import { GmailMessage } from '../services/ingestor/src/types';

// Read the example email
const emailContent = readFileSync('../yappy-receive.txt', 'utf-8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Yappy Parser Test - RECEIVE (Credit)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📧 Email body:');
console.log(emailContent);
console.log('\n');

// Create a mock Gmail message
const mockMessage: GmailMessage = {
  id: 'test-456',
  threadId: 'thread-456',
  labelIds: ['INBOX'],
  snippet: 'Test',
  historyId: '67890',
  internalDate: String(Date.now()),
  payload: {
    headers: [
      { name: 'From', value: 'notifications@yappy.com.pa' },
      { name: 'Subject', value: '¡Recibiste un Yappy! 💰' },
    ],
  },
};

// Test the parser
const parser = new YappyParser();

console.log('🔍 Testing parser...\n');

const canParse = parser.canParse(
  mockMessage,
  'notifications@yappy.com.pa',
  '¡Recibiste un Yappy! 💰'
);

console.log(`✓ canParse: ${canParse}`);

if (canParse) {
  const result = parser.parse(emailContent, mockMessage);

  if (result) {
    console.log('\n✅ Parse successful!\n');
    console.log('📊 Extracted transaction:');
    console.log(`   Type: ${result.type} (should be "payment" for receive/credit)`);
    console.log(`   Channel: ${result.channel}`);
    console.log(`   Amount: ${result.amount} ${result.currency}`);
    console.log(`   Merchant/Sender: ${result.merchant}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
    console.log(`   Description: ${result.description}`);

    console.log('\n🎯 Expected values:');
    console.log('   Type: payment (receive/credit)');
    console.log('   Amount: 50 USD');
    console.log('   Merchant: Maria Rodriguez (62345678)');
    console.log('   Reference: RECIB-12345678');
    console.log('   Date: 02 nov 2025 08:30 a. m.');
    console.log('   Description: Yappy Receive (Credit)');

    // Validation
    console.log('\n📋 Validation:');
    console.log(`   ✓ Amount: ${result.amount === 50 ? '✅' : '❌'} (${result.amount})`);
    console.log(`   ✓ Type: ${result.type === 'payment' ? '✅' : '❌'} (${result.type})`);
    console.log(
      `   ✓ Merchant: ${result.merchant?.includes('Maria Rodriguez') ? '✅' : '❌'} (${result.merchant})`
    );
    console.log(
      `   ✓ Reference: ${result.referenceNumber === 'RECIB-12345678' ? '✅' : '❌'} (${result.referenceNumber})`
    );
    console.log(
      `   ✓ Description: ${result.description === 'Yappy Receive (Credit)' ? '✅' : '❌'} (${result.description})`
    );
  } else {
    console.log('\n❌ Parse failed - returned null');
  }
} else {
  console.log('\n❌ Parser cannot parse this email');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
