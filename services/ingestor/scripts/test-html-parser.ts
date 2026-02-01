#!/usr/bin/env node
/**
 * Test Yappy parser with HTML format
 */

import { YappyParser } from '../src/parsers/yappy.js';

const htmlEmail = `<!DOCTYPE html>
<html>
<body>
<h1><strong>Te enviaron por Yappy</strong></h1>
<h2><strong>$225.00</strong></h2>
<p style="font-size:18px;">Enviado por</p>
<p><strong>Evelina</strong><strong> Cedeño</strong></p>
<p><img src="ico-cellphone.png"/><strong style="margin-left: 2px;">64524191</strong></p>
<td align="right"><strong>12 jun 2025 12:03 p. m.</strong></td>
<td align="right"><strong>SWJHH-92809010</strong></td>
</body>
</html>`;

const message = {
  id: 'test-id',
  threadId: 'test-thread',
  labelIds: ['financial'],
  snippet: 'Te enviaron por Yappy',
  payload: {
    headers: [
      { name: 'Subject', value: '¡Te enviaron por Yappy! 💸' },
      { name: 'From', value: 'noreply@yappy.com.pa' },
    ],
    mimeType: 'text/html',
    body: {
      data: Buffer.from(htmlEmail).toString('base64'),
    },
  },
  sizeEstimate: 5000,
  historyId: '12345',
  internalDate: '1730530620000',
};

const parser = new YappyParser();
const result = parser.parse(htmlEmail, message as any);

console.log('Parser result for HTML email:', JSON.stringify(result, null, 2));

if (result && result.merchant && result.merchant !== 'Yappy Payment') {
  console.log('\n✅ SUCCESS: Parser extracted merchant from HTML');
} else {
  console.log('\n❌ FAILED: Parser did not extract merchant from HTML');
  console.log('Expected: Evelina Cedeño (64524191)');
  console.log('Got:', result?.merchant || 'null');
}
