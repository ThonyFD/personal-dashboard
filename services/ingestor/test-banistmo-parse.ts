import * as fs from 'fs';
import { BanistmoParser } from './src/parsers/banistmo';

const parser = new BanistmoParser();
const emailContent = fs.readFileSync('/Users/thonyfd/projects/personal-dashboard/banistmo.txt', 'utf-8');

const mockMessage = {
  id: 'test123',
  threadId: 'thread123',
  historyId: '123',
  internalDate: Date.now().toString(),
  labelIds: ['INBOX'],
  payload: { headers: [] }
};

const result = parser.parse(emailContent, mockMessage as any);

if (result) {
  console.log('✅ Parse successful!');
  console.log('📊 Extracted transaction:');
  console.log(`   Type: ${result.type}`);
  console.log(`   Channel: ${result.channel}`);
  console.log(`   Amount: ${result.amount} ${result.currency}`);
  console.log(`   Merchant: ${result.merchant}`);
  console.log(`   Date: ${result.date}`);
  console.log(`   Card Last 4: ${result.cardLast4 || 'N/A'}`);
  console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
} else {
  console.log('❌ Parse failed!');
}
