import * as fs from 'fs';
import { YappyParser } from './src/parsers/yappy';

const parser = new YappyParser();
const emailContent = fs.readFileSync('/Users/thonyfd/projects/personal-dashboard/yappy.txt', 'utf-8');

const mockMessage = {
  id: 'test123',
  threadId: 'thread123',
  historyId: '123',
  internalDate: Date.now().toString(),
  labelIds: ['INBOX'],
  payload: {
    headers: [
      { name: 'Subject', value: '¡Enviaste un Yappy! 💸' }
    ]
  }
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
  console.log(`   Reference: ${result.referenceNumber || 'N/A'}`);
} else {
  console.log('❌ Parse failed!');
}
