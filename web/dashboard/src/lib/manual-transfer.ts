// Helpers for the manual transfer form. The merchant of the last saved transfer
// is remembered per browser, so the usual payee comes preselected. No names live
// in the code: the repo is public.

const LAST_MERCHANT_KEY = 'manual-transfer:last-merchant';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLastMerchantId(storage: KeyValueStorage | null = browserStorage()): number | null {
  if (!storage) return null;
  try {
    const id = Number(storage.getItem(LAST_MERCHANT_KEY));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function saveLastMerchantId(storage: KeyValueStorage | null, id: number): void {
  if (!storage) return;
  try {
    storage.setItem(LAST_MERCHANT_KEY, String(id));
  } catch {
    // Storage blocked: the form still works, it just won't preselect next time.
  }
}

export function resolveMerchant<T extends { id: number; name: string }>(merchants: T[], typed: string): T | null {
  const wanted = typed.trim().toLowerCase();
  if (!wanted) return null;
  return merchants.find((m) => m.name.trim().toLowerCase() === wanted) ?? null;
}
