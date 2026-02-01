#!/usr/bin/env node
/**
 * Test Yappy parser with a sample email
 */

import { YappyParser } from '../src/parsers/yappy.js';
import { readFileSync } from 'fs';

const emailBody = `Hola,

Has enviado un Yappy de $80.00

A: Binyu Xie (61944111)

Fecha: 02 nov 2025 06:17 p. m.

Confirmación: BIKEM-75792146

Gracias por usar Yappy, tu forma más fácil y rápida de pagar.
`;

const message = {
  id: 'test-id',
  threadId: 'test-thread',
  labelIds: ['financial'],
  snippet: 'Has enviado un Yappy',
  payload: {
    headers: [
      { name: 'Subject', value: '¡Enviaste un Yappy! 💸' },
      { name: 'From', value: 'noreply@yappy.com.pa' },
    ],
    mimeType: 'text/plain',
    body: {
      data: Buffer.from(emailBody).toString('base64'),
    },
  },
  sizeEstimate: 1000,
  historyId: '12345',
  internalDate: '1730530620000',
};

const parser = new YappyParser();
const result = parser.parse(emailBody, message as any);

console.log('Parser result:', JSON.stringify(result, null, 2));
