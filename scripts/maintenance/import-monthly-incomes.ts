#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface CsvMovement {
  date: string;
  description: string;
  debit: number;
  credit: number;
}

interface MonthlyAggregate {
  year: number;
  month: number;
  amount: number;
  movementCount: number;
  firstDate: string;
  lastDate: string;
}

interface MonthlyIncomeRow {
  id: number;
  year: number;
  month: number;
  source: string;
  amount: number | string;
  notes: string | null;
}

interface CliOptions {
  csvPath: string;
  source: string;
  dryRun: boolean;
  pattern: RegExp;
}

function printUsage(): never {
  console.error(
    [
      'Uso:',
      '  npm run import:monthly-incomes -- --csv=/ruta/archivo.csv [--source=Planilla] [--pattern=PAGO] [--dry-run]',
      '',
      'Variables aceptadas para Supabase:',
      '  SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY',
      '  o VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY',
    ].join('\n')
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const csvArg = argv.find((arg) => arg.startsWith('--csv='));
  const sourceArg = argv.find((arg) => arg.startsWith('--source='));
  const patternArg = argv.find((arg) => arg.startsWith('--pattern='));

  if (!csvArg) {
    printUsage();
  }

  const csvPath = csvArg.slice('--csv='.length).trim();
  if (!csvPath) {
    printUsage();
  }

  const source = sourceArg?.slice('--source='.length).trim() || 'Planilla';
  const patternText = patternArg?.slice('--pattern='.length).trim() || 'PAGO';

  return {
    csvPath,
    source,
    dryRun: argv.includes('--dry-run'),
    pattern: new RegExp(patternText, 'i'),
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseAmount(raw: string | undefined): number {
  const value = (raw ?? '').replace(/"/g, '').replace(/,/g, '').trim();
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Monto inválido: "${raw}"`);
  }
  return parsed;
}

function toIsoDate(dateText: string): string {
  const [month, day, year] = dateText.split('/').map(Number);
  if (!month || !day || !year) {
    throw new Error(`Fecha inválida: "${dateText}"`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function loadMovements(csvPath: string): CsvMovement[] {
  const raw = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const headerIndex = lines.findIndex((line) => line.startsWith('Date,Description,Debit,Credit,Balance'));
  if (headerIndex === -1) {
    throw new Error('No se encontró la cabecera de movimientos en el CSV.');
  }

  return lines.slice(headerIndex + 1).map((line) => {
    const [date, description, debit, credit] = parseCsvLine(line);

    return {
      date: toIsoDate(date),
      description,
      debit: parseAmount(debit),
      credit: parseAmount(credit),
    };
  });
}

function aggregatePayrollMovements(movements: CsvMovement[], pattern: RegExp): MonthlyAggregate[] {
  const buckets = new Map<string, MonthlyAggregate>();

  for (const movement of movements) {
    if (movement.credit <= 0) continue;
    if (!pattern.test(movement.description)) continue;

    const [yearText, monthText] = movement.date.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const key = `${year}-${month}`;

    const existing = buckets.get(key);

    if (!existing) {
      buckets.set(key, {
        year,
        month,
        amount: movement.credit,
        movementCount: 1,
        firstDate: movement.date,
        lastDate: movement.date,
      });
      continue;
    }

    existing.amount += movement.credit;
    existing.movementCount += 1;
    if (movement.date < existing.firstDate) existing.firstDate = movement.date;
    if (movement.date > existing.lastDate) existing.lastDate = movement.date;
  }

  return Array.from(buckets.values()).sort((left, right) => {
    if (left.year !== right.year) return left.year - right.year;
    return left.month - right.month;
  });
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan credenciales de Supabase. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, o usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }

  return { url, key };
}

function buildImportNote(fileName: string, aggregate: MonthlyAggregate): string {
  return `Importado desde ${fileName}. Movimientos: ${aggregate.movementCount}. Rango: ${aggregate.firstDate} a ${aggregate.lastDate}.`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const movements = loadMovements(options.csvPath);
  const aggregates = aggregatePayrollMovements(movements, options.pattern);

  if (aggregates.length === 0) {
    console.log('No se encontraron ingresos que coincidan con el patrón indicado.');
    return;
  }

  console.log(`Archivo: ${options.csvPath}`);
  console.log(`Fuente destino: ${options.source}`);
  console.log(`Patrón: ${options.pattern}`);
  console.log(`Modo: ${options.dryRun ? 'dry-run' : 'apply'}\n`);

  for (const aggregate of aggregates) {
    console.log(
      `${aggregate.year}-${String(aggregate.month).padStart(2, '0')}: $${aggregate.amount.toFixed(2)} (${aggregate.movementCount} movimientos)`
    );
  }

  const total = aggregates.reduce((sum, aggregate) => sum + aggregate.amount, 0);
  console.log(`\nTotal a importar: $${total.toFixed(2)}\n`);

  if (options.dryRun) {
    return;
  }

  const { url, key } = getSupabaseConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const years = [...new Set(aggregates.map((aggregate) => aggregate.year))];
  const months = [...new Set(aggregates.map((aggregate) => aggregate.month))];

  const { data: existingRows, error: existingError } = await supabase
    .from('monthly_incomes')
    .select('id, year, month, source, amount, notes')
    .eq('source', options.source)
    .in('year', years)
    .in('month', months);

  if (existingError) {
    throw new Error(`No se pudieron consultar ingresos existentes: ${existingError.message}`);
  }

  const existingByPeriod = new Map<string, MonthlyIncomeRow>();
  for (const row of (existingRows ?? []) as MonthlyIncomeRow[]) {
    existingByPeriod.set(`${row.year}-${row.month}`, row);
  }

  const fileName = path.basename(options.csvPath);
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const aggregate of aggregates) {
    const keyByPeriod = `${aggregate.year}-${aggregate.month}`;
    const existing = existingByPeriod.get(keyByPeriod);
    const timestamp = new Date().toISOString();

    if (!existing) {
      const { error } = await supabase.from('monthly_incomes').insert({
        year: aggregate.year,
        month: aggregate.month,
        source: options.source,
        amount: Number(aggregate.amount.toFixed(2)),
        notes: buildImportNote(fileName, aggregate),
        created_at: timestamp,
        updated_at: timestamp,
      });

      if (error) {
        throw new Error(
          `No se pudo insertar ${aggregate.year}-${String(aggregate.month).padStart(2, '0')}: ${error.message}`
        );
      }

      inserted += 1;
      continue;
    }

    const existingAmount = Number(existing.amount);
    const nextAmount = Number(aggregate.amount.toFixed(2));

    if (existingAmount === nextAmount) {
      unchanged += 1;
      continue;
    }

    const { error } = await supabase
      .from('monthly_incomes')
      .update({ amount: nextAmount, updated_at: timestamp })
      .eq('id', existing.id);

    if (error) {
      throw new Error(
        `No se pudo actualizar ${aggregate.year}-${String(aggregate.month).padStart(2, '0')}: ${error.message}`
      );
    }

    updated += 1;
  }

  console.log('Importación completada.');
  console.log(`Insertados: ${inserted}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Sin cambios: ${unchanged}`);
}

main().catch((error) => {
  console.error('Error al importar ingresos:', error instanceof Error ? error.message : error);
  process.exit(1);
});
