import { describe, expect, it } from 'vitest';
import { readLastMerchantId, resolveMerchant, saveLastMerchantId } from './manual-transfer';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('last used merchant', () => {
  it('remembers the merchant of the last saved transfer', () => {
    const storage = memoryStorage();
    saveLastMerchantId(storage, 42);
    expect(readLastMerchantId(storage)).toBe(42);
  });

  it('is null when nothing was saved or the value is not an id', () => {
    expect(readLastMerchantId(memoryStorage())).toBeNull();
    expect(readLastMerchantId(memoryStorage({ 'manual-transfer:last-merchant': 'abc' }))).toBeNull();
  });

  it('works without storage (private window, blocked site data)', () => {
    expect(readLastMerchantId(throwingStorage)).toBeNull();
    expect(() => saveLastMerchantId(throwingStorage, 42)).not.toThrow();
    expect(readLastMerchantId(null)).toBeNull();
  });
});

describe('resolveMerchant', () => {
  const merchants = [
    { id: 1, name: 'Super 99' },
    { id: 42, name: 'KG' },
  ];

  it('matches the typed name ignoring case and outer spaces', () => {
    expect(resolveMerchant(merchants, '  kg ')).toEqual({ id: 42, name: 'KG' });
  });

  it('is null for a name that is not in the list', () => {
    expect(resolveMerchant(merchants, 'K')).toBeNull();
    expect(resolveMerchant(merchants, '')).toBeNull();
  });
});
