import { describe, expect, it } from 'vitest';
import {
  alertAsOfDate,
  budgetAlertEligibility,
  buildBudgetAlert,
  formatUsd,
  panamaDate,
  type AlertSettings,
  type AlertTransaction,
  type BudgetStatus,
} from './budget-alerts.js';

// All values here are made up. Real caps and cards live only in Supabase.
function settings(overrides: Partial<AlertSettings> = {}): AlertSettings {
  return {
    alertsEnabled: true,
    notifyEveryPurchase: true,
    bigPurchaseThreshold: 100,
    frozenCards: ['1111', '2222'],
    ...overrides,
  };
}

function txn(overrides: Partial<AlertTransaction> = {}): AlertTransaction {
  return {
    id: 10,
    amount: 12.5,
    txnType: 'PURCHASE',
    merchantName: 'CAFE TEST',
    cardLast4: '9999',
    categoryId: 1,
    ...overrides,
  };
}

function budget(overrides: Partial<BudgetStatus> = {}): BudgetStatus {
  const monthlyLimit = overrides.monthlyLimit ?? 200;
  const spent = overrides.spent ?? 50;
  return {
    categoryId: 1,
    label: 'Comida fuera',
    emoji: '☕',
    monthlyLimit,
    spent,
    remaining: monthlyLimit - spent,
    pct: (spent / monthlyLimit) * 100,
    daysLeft: 9,
    ...overrides,
  };
}

function sent(result: ReturnType<typeof buildBudgetAlert>) {
  if (!result.send) throw new Error(`expected a message, got skip: ${result.reason}`);
  return result.message;
}

describe('formatUsd', () => {
  it('uses thousands separators and two decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(87.6)).toBe('$87.60');
  });

  it('rounds to cents', () => {
    expect(formatUsd(1234567.891)).toBe('$1,234,567.89');
    expect(formatUsd(0.1 + 0.2)).toBe('$0.30');
    expect(formatUsd(-31.2)).toBe('-$31.20');
  });
});

describe('panamaDate and alertAsOfDate', () => {
  it('reads the date in America/Panama, not UTC', () => {
    // 2026-11-30 23:30 in Panama is already 2026-12-01 in UTC.
    expect(panamaDate(new Date('2026-12-01T04:30:00Z'))).toBe('2026-11-30');
    expect(panamaDate(new Date('2026-12-01T05:00:00Z'))).toBe('2026-12-01');
  });

  it('uses today when the purchase is in the current month', () => {
    const now = new Date('2026-11-21T15:00:00Z');
    expect(alertAsOfDate('2026-11-20', now)).toBe('2026-11-21');
    expect(alertAsOfDate('2026-11-21', now)).toBe('2026-11-21');
  });

  it('uses the last day of the purchase month when the month already closed', () => {
    // Purchase on 30/11 picked up on 01/12 at 08:00 Panama.
    expect(alertAsOfDate('2026-11-30', new Date('2026-12-01T13:00:00Z'))).toBe('2026-11-30');
    expect(alertAsOfDate('2026-02-28', new Date('2026-03-01T13:00:00Z'))).toBe('2026-02-28');
  });

  it('keeps a purchase at 23:30 on 30/11 in November', () => {
    const now = new Date('2026-12-01T04:40:00Z'); // 23:40 Panama on 30/11
    expect(alertAsOfDate('2026-11-30', now)).toBe('2026-11-30');
    expect(budgetAlertEligibility({ txnId: 5, txnType: 'PURCHASE', txnDate: '2026-11-30', enabled: true, now }))
      .toEqual({ eligible: true });
  });
});

describe('budgetAlertEligibility', () => {
  const now = new Date('2026-11-21T15:00:00Z'); // 10:00 Panama
  const base = { txnId: 5, txnType: 'purchase', txnDate: '2026-11-21', enabled: true, now };

  it('accepts a new purchase or transfer from today or yesterday', () => {
    expect(budgetAlertEligibility(base)).toEqual({ eligible: true });
    expect(budgetAlertEligibility({ ...base, txnType: 'TRANSFER', txnDate: '2026-11-20' })).toEqual({ eligible: true });
  });

  it('skips duplicates', () => {
    expect(budgetAlertEligibility({ ...base, txnId: -1 })).toEqual({ eligible: false, reason: 'duplicate' });
  });

  it('skips when the flag is off', () => {
    expect(budgetAlertEligibility({ ...base, enabled: false })).toEqual({ eligible: false, reason: 'disabled' });
  });

  it('skips income, payments and refunds', () => {
    for (const txnType of ['INCOME', 'payment', 'REFUND', 'withdrawal']) {
      expect(budgetAlertEligibility({ ...base, txnType })).toEqual({ eligible: false, reason: 'type' });
    }
  });

  it('skips old or future dates', () => {
    expect(budgetAlertEligibility({ ...base, txnDate: '2026-11-19' })).toEqual({ eligible: false, reason: 'stale' });
    expect(budgetAlertEligibility({ ...base, txnDate: '2026-11-22' })).toEqual({ eligible: false, reason: 'stale' });
  });
});

describe('buildBudgetAlert single rules', () => {
  it('budget under 80 % with notify_every_purchase', () => {
    const msg = sent(buildBudgetAlert(txn(), settings(), budget({ spent: 112.4, monthlyLimit: 200 })));
    expect(msg.rules).toEqual(['budget_ok']);
    expect(msg.title).toBe('☕ Comida fuera');
    expect(msg.body).toBe('$112.40 de $200.00 · te quedan $87.60 para 9 días');
  });

  it('budget under 80 % without notify_every_purchase sends nothing', () => {
    const result = buildBudgetAlert(txn(), settings({ notifyEveryPurchase: false }), budget({ spent: 50 }));
    expect(result).toEqual({ send: false, reason: 'no_rule' });
  });

  it('budget between 80 % and 99 % shows the floored percentage', () => {
    const msg = sent(buildBudgetAlert(txn(), settings({ notifyEveryPurchase: false }), budget({ spent: 176.1, monthlyLimit: 200 })));
    expect(msg.rules).toEqual(['budget_warning']);
    expect(msg.title).toBe('⚠️ Comida fuera al 88 %');
    expect(msg.body).toBe('$176.10 de $200.00 · te quedan $23.90 para 9 días');
  });

  it('exactly 80 % is a warning and 99.99 % is still 99 %', () => {
    expect(sent(buildBudgetAlert(txn(), settings(), budget({ spent: 160 }))).title).toBe('⚠️ Comida fuera al 80 %');
    expect(sent(buildBudgetAlert(txn(), settings(), budget({ spent: 199.98 }))).title).toBe('⚠️ Comida fuera al 99 %');
  });

  it('budget over 100 %', () => {
    const msg = sent(buildBudgetAlert(txn(), settings(), budget({ spent: 231.2, monthlyLimit: 200 })));
    expect(msg.rules).toEqual(['budget_exceeded']);
    expect(msg.title).toBe('🔴 Comida fuera: tope superado');
    expect(msg.body).toBe('$231.20 de $200.00 · te pasaste $31.20 este mes');
  });

  it('budget exactly at 100 % says the cap was reached', () => {
    const msg = sent(buildBudgetAlert(txn(), settings(), budget({ spent: 200, monthlyLimit: 200 })));
    expect(msg.rules).toEqual(['budget_exceeded']);
    expect(msg.title).toBe('🔴 Comida fuera: tope alcanzado');
    expect(msg.body).toBe('$200.00 de $200.00 · llegaste al tope este mes');
  });

  it('uses singular for one day left', () => {
    const msg = sent(buildBudgetAlert(txn(), settings(), budget({ spent: 20, daysLeft: 1 })));
    expect(msg.body).toBe('$20.00 de $200.00 · te quedan $180.00 para 1 día');
  });

  it('frozen card', () => {
    const msg = sent(buildBudgetAlert(txn({ cardLast4: '1111', amount: 25, merchantName: 'STREAMING CO', categoryId: null }), settings(), undefined));
    expect(msg.rules).toEqual(['frozen_card']);
    expect(msg.title).toBe('⚠️ Cargo en tarjeta apagada');
    expect(msg.body).toBe('****1111: $25.00 en STREAMING CO. Esta tarjeta no debería tener cargos nuevos.');
  });

  it('big purchase without a budget explains the threshold', () => {
    const msg = sent(buildBudgetAlert(txn({ amount: 649, merchantName: 'BIG STORE', categoryId: 7 }), settings(), undefined));
    expect(msg.rules).toEqual(['big_purchase']);
    expect(msg.title).toBe('🛍️ Compra de $649.00 en BIG STORE');
    expect(msg.body).toBe('Supera tu umbral de compra grande de $100.00.');
  });

  it('a purchase exactly at the threshold counts as big', () => {
    const msg = sent(buildBudgetAlert(txn({ amount: 100, categoryId: null }), settings(), undefined));
    expect(msg.rules).toEqual(['big_purchase']);
  });

  it('a purchase just under the threshold without budget sends nothing', () => {
    expect(buildBudgetAlert(txn({ amount: 99.99, categoryId: null }), settings(), undefined))
      .toEqual({ send: false, reason: 'no_rule' });
  });
});

describe('buildBudgetAlert combined rules', () => {
  it('big purchase plus budget line, one push', () => {
    const msg = sent(buildBudgetAlert(txn({ amount: 150, merchantName: 'BIG STORE' }), settings(), budget({ spent: 170, monthlyLimit: 200 })));
    expect(msg.rules).toEqual(['big_purchase', 'budget_warning']);
    expect(msg.title).toBe('🛍️ Compra de $150.00 en BIG STORE');
    expect(msg.body).toBe('$170.00 de $200.00 · te quedan $30.00 para 9 días');
  });

  it('frozen card wins the title and keeps the budget line', () => {
    const msg = sent(buildBudgetAlert(txn({ cardLast4: '2222', amount: 120 }), settings(), budget({ spent: 250 })));
    expect(msg.rules).toEqual(['frozen_card', 'big_purchase', 'budget_exceeded']);
    expect(msg.title).toBe('⚠️ Cargo en tarjeta apagada');
    expect(msg.body).toBe(
      '****2222: $120.00 en CAFE TEST. Esta tarjeta no debería tener cargos nuevos.\n'
      + '$250.00 de $200.00 · te pasaste $50.00 este mes',
    );
  });
});

describe('buildBudgetAlert skips', () => {
  it('skips everything when alerts are disabled', () => {
    expect(buildBudgetAlert(txn({ cardLast4: '1111' }), settings({ alertsEnabled: false }), budget()))
      .toEqual({ send: false, reason: 'disabled' });
  });

  it('skips refunds and income', () => {
    expect(buildBudgetAlert(txn({ txnType: 'REFUND' }), settings(), budget())).toEqual({ send: false, reason: 'type' });
    expect(buildBudgetAlert(txn({ txnType: 'INCOME' }), settings(), budget())).toEqual({ send: false, reason: 'type' });
  });

  it('a big transfer to a person without a budgeted category sends nothing', () => {
    const result = buildBudgetAlert(txn({ txnType: 'TRANSFER', amount: 500, cardLast4: null, categoryId: null }), settings(), undefined);
    expect(result).toEqual({ send: false, reason: 'no_rule' });
  });

  it('a transfer to a budgeted merchant gets the budget line', () => {
    const msg = sent(buildBudgetAlert(txn({ txnType: 'TRANSFER', amount: 12, cardLast4: null }), settings(), budget({ spent: 60 })));
    expect(msg.rules).toEqual(['budget_ok']);
  });

  it('falls back to a generic merchant name', () => {
    const msg = sent(buildBudgetAlert(txn({ amount: 300, merchantName: '  ', categoryId: null }), settings(), undefined));
    expect(msg.title).toBe('🛍️ Compra de $300.00 en comercio sin nombre');
  });
});
