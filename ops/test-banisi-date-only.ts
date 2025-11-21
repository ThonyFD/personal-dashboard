#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { BanisiParser } from '../services/ingestor/src/parsers/banisi';

const emailContent = readFileSync('../banisi.txt', 'utf-8');

const parser = new BanisiParser();
const extractDateMethod = (parser as any).extractDate.bind(parser);

const cleanHTML = (text: string): string => {
  let cleaned = text
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

  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned
    .replace(/:=\s/g, ': ')
    .replace(/=\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
};

const cleaned = cleanHTML(emailContent);
const extractedDate = extractDateMethod(cleaned);

console.log('Extracted date:', extractedDate);
console.log('Date details:');
console.log('  Year:', extractedDate?.getFullYear());
console.log('  Month:', extractedDate?.getMonth() + 1);
console.log('  Day:', extractedDate?.getDate());
console.log('  Hour:', extractedDate?.getHours());
console.log('  Minute:', extractedDate?.getMinutes());
console.log('  Second:', extractedDate?.getSeconds());

const normalizeMethod = (parser as any).normalizeToTimeZone.bind(parser);
const normalized = normalizeMethod(extractedDate);

console.log('\nNormalized date:', normalized);
console.log('Normalized date details:');
console.log('  Year:', normalized?.getFullYear());
console.log('  Month:', normalized?.getMonth() + 1);
console.log('  Day:', normalized?.getDate());
console.log('  Hour:', normalized?.getHours());
console.log('  Minute:', normalized?.getMinutes());
console.log('  Second:', normalized?.getSeconds());
