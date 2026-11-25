/**
 * Pure rules for per-purchase budget alerts. No I/O here: the sync job loads the
 * transaction, the settings and the budget_status() row, then asks these functions
 * whether to push and what to say. One push per transaction at most.
 */

export const PANAMA_TIME_ZONE = 'America/Panama';

/** Transaction types that can trigger an alert. Yappy payments are stored as TRANSFER. */
export const ALERTABLE_TXN_TYPES = ['PURCHASE', 'TRANSFER'] as const;

export interface AlertSettings {
  alertsEnabled: boolean;
  notifyEveryPurchase: boolean;
  bigPurchaseThreshold: number;
  /** Last 4 digits of cards that should not see new charges. */
  frozenCards: string[];
}

export interface AlertTransaction {
  id: number;
  amount: number;
  txnType: string;
  merchantName: string | null;
  cardLast4: string | null;
  /** Category of the transaction's merchant, null when uncategorized. */
  categoryId: number | null;
  /** Transfer between the owner's own accounts: never alerts. */
  isOwnAccount?: boolean;
}

/** One row of budget_status(), already including the transaction being alerted. */
export interface BudgetStatus {
  categoryId: number;
  label: string;
  emoji: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  pct: number;
  daysLeft: number;
}

export type BudgetAlertRule =
  | 'frozen_card'
  | 'big_purchase'
  | 'budget_ok'
  | 'budget_warning'
  | 'budget_exceeded';

export interface BudgetAlertMessage {
  rules: BudgetAlertRule[];
  title: string;
  body: string;
}

export type BudgetAlertResult =
  | { send: true; message: BudgetAlertMessage }
  | { send: false; reason: 'disabled' | 'type' | 'own_account' | 'no_rule' };

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: 'duplicate' | 'disabled' | 'type' | 'stale' };

const WARNING_PCT = 80;
const EXCEEDED_PCT = 100;

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$1,234.56`. */
export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

/** YYYY-MM-DD of `now` in America/Panama. */
export function panamaDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(date: string): string {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function isAlertableType(txnType: string): boolean {
  return (ALERTABLE_TXN_TYPES as readonly string[]).includes(txnType.toUpperCase());
}

/**
 * Should a freshly inserted transaction trigger an alert at all? Guards against
 * duplicates, backfills and late emails: only today or yesterday (Panama) count.
 */
export function budgetAlertEligibility(input: {
  txnId: number;
  txnType: string;
  txnDate: string;
  enabled: boolean;
  now: Date;
}): EligibilityResult {
  if (input.txnId === -1) return { eligible: false, reason: 'duplicate' };
  if (!input.enabled) return { eligible: false, reason: 'disabled' };
  if (!isAlertableType(input.txnType)) return { eligible: false, reason: 'type' };

  if (!alertWindowDates(input.now).includes(input.txnDate)) {
    return { eligible: false, reason: 'stale' };
  }
  return { eligible: true };
}

/** The txn_date values that can still alert: yesterday and today in Panama. */
export function alertWindowDates(now: Date): string[] {
  const today = panamaDate(now);
  return [shiftDate(today, -1), today];
}

/**
 * Date to pass to budget_status() so the spend includes this transaction:
 * today when the purchase is in the current month, otherwise the last day of the
 * purchase's month (a purchase on the 30th picked up on the 1st still counts
 * against the month it belongs to).
 */
export function alertAsOfDate(txnDate: string, now: Date): string {
  const today = panamaDate(now);
  if (txnDate > today) return txnDate;
  if (txnDate.slice(0, 7) === today.slice(0, 7)) return today;
  return lastDayOfMonth(txnDate);
}

function daysText(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}

function budgetPart(
  budget: BudgetStatus,
  notifyEveryPurchase: boolean,
): { rule: BudgetAlertRule; title: string; line: string } | null {
  const pct = (budget.spent / budget.monthlyLimit) * 100;
  const head = `${formatUsd(budget.spent)} de ${formatUsd(budget.monthlyLimit)}`;
  const over = budget.spent - budget.monthlyLimit;

  if (pct >= EXCEEDED_PCT) {
    if (Math.abs(over) < 0.005) {
      return {
        rule: 'budget_exceeded',
        title: `🔴 ${budget.label}: tope alcanzado`,
        line: `${head} · llegaste al tope este mes`,
      };
    }
    return {
      rule: 'budget_exceeded',
      title: `🔴 ${budget.label}: tope superado`,
      line: `${head} · te pasaste ${formatUsd(over)} este mes`,
    };
  }

  const remainingLine = `${head} · te quedan ${formatUsd(budget.remaining)} para ${daysText(budget.daysLeft)}`;

  if (pct >= WARNING_PCT) {
    return {
      rule: 'budget_warning',
      title: `⚠️ ${budget.label} al ${Math.floor(pct)} %`,
      line: remainingLine,
    };
  }

  if (!notifyEveryPurchase) return null;
  return { rule: 'budget_ok', title: `${budget.emoji} ${budget.label}`, line: remainingLine };
}

/**
 * Builds the single push for a transaction, combining every rule that applies.
 * Title priority: frozen card, then big purchase, then budget.
 * `budget` is the budget_status() row of the transaction's category, if any.
 */
export function buildBudgetAlert(
  txn: AlertTransaction,
  settings: AlertSettings,
  budget: BudgetStatus | undefined,
): BudgetAlertResult {
  if (!settings.alertsEnabled) return { send: false, reason: 'disabled' };
  if (!isAlertableType(txn.txnType)) return { send: false, reason: 'type' };
  // Money moved between the owner's own accounts is not spending.
  if (txn.isOwnAccount) return { send: false, reason: 'own_account' };

  const merchant = txn.merchantName?.trim() || 'comercio sin nombre';
  const amount = formatUsd(txn.amount);
  const rules: BudgetAlertRule[] = [];
  const titles: string[] = [];
  const lines: string[] = [];

  if (txn.cardLast4 && settings.frozenCards.includes(txn.cardLast4)) {
    rules.push('frozen_card');
    titles.push('⚠️ Cargo en tarjeta apagada');
    lines.push(`****${txn.cardLast4}: ${amount} en ${merchant}. Esta tarjeta no debería tener cargos nuevos.`);
  }

  // A transfer is only "big" when it goes to a budgeted merchant, so rent or
  // transfers to people do not show up as purchases.
  const isPurchase = txn.txnType.toUpperCase() === 'PURCHASE';
  const isBig = txn.amount >= settings.bigPurchaseThreshold && (isPurchase || budget !== undefined);
  if (isBig) {
    rules.push('big_purchase');
    titles.push(`🛍️ Compra de ${amount} en ${merchant}`);
  }

  const part = budget ? budgetPart(budget, settings.notifyEveryPurchase) : null;
  if (part) {
    rules.push(part.rule);
    titles.push(part.title);
    lines.push(part.line);
  }

  if (rules.length === 0) return { send: false, reason: 'no_rule' };

  if (lines.length === 0) {
    lines.push(`Supera tu umbral de compra grande de ${formatUsd(settings.bigPurchaseThreshold)}.`);
  }

  return { send: true, message: { rules, title: titles[0], body: lines.join('\n') } };
}
