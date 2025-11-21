#!/usr/bin/env tsx
import { readFileSync } from 'fs';

const emailContent = readFileSync('../banisi.txt', 'utf-8');

// Simulate the cleanHTML function
let cleaned = emailContent
  .replace(/=20/g, ' ')
  .replace(/=09/g, '\t')
  .replace(/=\n/g, '')
  .replace(/=3D/g, '=')
  .replace(/=E9/g, 'é')
  .replace(/=F3/g, 'ó')
  .replace(/=FA/g, 'ú')
  .replace(/=ED/g, 'í')
  .replace(/=E1/g, 'á')
  .replace(/=F1/g, 'ñ')
  .replace(/=BF/g, '¿')
  .replace(/=A1/g, '¡')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"');

// Remove HTML tags
cleaned = cleaned.replace(/<[^>]+>/g, ' ');

// Clean up multiple spaces and special artifacts
cleaned = cleaned
  .replace(/:=\s/g, ': ')
  .replace(/=\s/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Search for date and time patterns
const dateSection = cleaned.match(/Fecha:.*?Hora:.*?m\./i);
console.log('Date section found:');
console.log(dateSection?.[0] || 'NOT FOUND');

// Try the regex
const dateTimePattern = /fecha:\s*(\d{2})-(\d{2})-(\d{4})\s+hora:\s*(\d{1,2}):(\d{2}):(\d{2})\s+(a\.\s*m\.|p\.\s*m\.)/i;
const match = cleaned.match(dateTimePattern);

console.log('\nRegex match:');
console.log(match || 'NO MATCH');
