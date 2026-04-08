#!/usr/bin/env tsx
/**
 * Converts pg_dump COPY FROM stdin blocks to INSERT statements.
 * Also removes incompatible GCP/Firebase-specific lines.
 */
import { readFileSync, writeFileSync } from 'fs';

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('Usage: tsx convert-copy-to-insert.ts <input.sql> <output.sql>');
  process.exit(1);
}

const content = readFileSync(input, 'utf8');
const lines = content.split('\n');
const result: string[] = [];

let inCopy = false;
let tableName = '';
let columns: string[] = [];
const batchSize = 100;
let batchRows: string[] = [];

function flushBatch() {
  if (batchRows.length === 0) return;
  result.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
  result.push(batchRows.join(',\n') + ';');
  batchRows = [];
}

function escape(val: string): string {
  if (val === '\\N') return 'NULL';
  // Escape single quotes
  const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "''");
  return `'${escaped}'`;
}

for (const line of lines) {
  // Skip Firebase/GCP incompatible lines
  if (line.startsWith('\\restrict') || line.startsWith('\\unrestrict')) continue;
  if (line.includes('cloudsqlsuperuser')) continue;
  // Skip SET ROLE / ALTER DEFAULT PRIVILEGES that may fail
  if (line.startsWith('GRANT ') && line.includes('cloudsql')) continue;

  if (!inCopy) {
    // Detect start of COPY block: COPY public.table (col1, col2, ...) FROM stdin;
    const copyMatch = line.match(/^COPY\s+(?:public\.)?(\w+)\s+\(([^)]+)\)\s+FROM\s+stdin\s*;/i);
    if (copyMatch) {
      inCopy = true;
      tableName = copyMatch[1];
      columns = copyMatch[2].split(',').map(c => c.trim());
      batchRows = [];
    } else {
      result.push(line);
    }
  } else {
    // Inside COPY block
    if (line === '\\.') {
      // End of COPY block
      flushBatch();
      inCopy = false;
    } else if (line === '') {
      // skip empty lines inside copy block
    } else {
      // Parse tab-separated row
      const fields = line.split('\t');
      const values = fields.map(escape);
      batchRows.push(`  (${values.join(', ')})`);
      if (batchRows.length >= batchSize) {
        flushBatch();
      }
    }
  }
}

writeFileSync(output, result.join('\n'), 'utf8');
console.log(`Converted: ${output}`);
