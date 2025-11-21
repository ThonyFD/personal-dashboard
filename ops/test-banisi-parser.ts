#!/usr/bin/env tsx
/**
 * Test script for Banisi parser
 * Tests with the example email from banisi.txt
 */

import { readFileSync } from 'fs';
import { BanisiParser } from '../services/ingestor/src/parsers/banisi';
import { GmailMessage } from '../services/ingestor/src/types';

// Read the example email
const emailContent = readFileSync('../banisi.txt', 'utf-8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Banisi Parser Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📧 Email subject: Confirmación de Pago a Préstamo');
console.log('📧 Email from: Banisi_Notificaciones@banisipanama.com\n');

// Create a mock Gmail message
const mockMessage: GmailMessage = {
  id: 'test-789',
  threadId: 'thread-789',
  labelIds: ['INBOX'],
  snippet: 'Test',
  historyId: '54321',
  internalDate: String(Date.now()),
  payload: {
    headers: [
      { name: 'From', value: 'Banisi_Notificaciones@banisipanama.com' },
      { name: 'Subject', value: 'Confirmación de Pago a Préstamo' },
    ],
  },
};

// Test the parser
const parser = new BanisiParser();

console.log('🔍 Testing parser...\n');

const canParse = parser.canParse(
  mockMessage,
  'Banisi_Notificaciones@banisipanama.com',
  'Confirmación de Pago a Préstamo'
);

console.log(`✓ canParse: ${canParse}`);

if (canParse) {
  const result = parser.parse(emailContent, mockMessage);

  if (result) {
    console.log('\n✅ Parse successful!\n');
    console.log('📊 Extracted transaction:');
    console.log(`   Type: ${result.type}`);
    console.log(`   Channel: ${result.channel}`);
    console.log(`   Amount: ${result.amount} ${result.currency}`);
    console.log(`   Merchant: ${result.merchant}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
    console.log(`   Description: ${result.description}`);

    console.log('\n🎯 Expected values:');
    console.log('   Type: payment');
    console.log('   Channel: bank_transfer');
    console.log('   Amount: 436.93 USD');
    console.log('   Merchant: Loan Payment 100-213-228177');
    console.log('   Reference: 76751297');
    console.log('   Date: 06-10-2025 7:47:26 p.m.');

    // Validation
    console.log('\n📋 Validation:');
    console.log(`   ✓ Amount: ${result.amount === 436.93 ? '✅' : '❌'} (${result.amount})`);
    console.log(`   ✓ Type: ${result.type === 'payment' ? '✅' : '❌'} (${result.type})`);
    console.log(`   ✓ Channel: ${result.channel === 'bank_transfer' ? '✅' : '❌'} (${result.channel})`);
    console.log(
      `   ✓ Merchant: ${result.merchant?.includes('Loan Payment') ? '✅' : '❌'} (${result.merchant})`
    );
    console.log(
      `   ✓ Reference: ${result.referenceNumber === '76751297' ? '✅' : '❌'} (${result.referenceNumber})`
    );

    // Check date components
    if (result.date) {
      const date = new Date(result.date);
      const day = date.getDate();
      const month = date.getMonth() + 1; // 0-indexed
      const year = date.getFullYear();
      const hour = date.getHours();
      const minute = date.getMinutes();

      console.log(
        `   ✓ Date: ${day === 6 && month === 10 && year === 2025 ? '✅' : '❌'} (${day}/${month}/${year})`
      );
      console.log(`   ✓ Time: ${hour === 19 && minute === 47 ? '✅' : '❌'} (${hour}:${minute})`);
    }
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
