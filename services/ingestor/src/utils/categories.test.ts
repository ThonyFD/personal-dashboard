import { describe, expect, it } from 'vitest';
import { autoCategorizeMerchant } from './categories.js';

describe('autoCategorizeMerchant BAR keyword', () => {
  it('does not treat BAR inside another word as a bar', () => {
    expect(autoCategorizeMerchant('ROOSEVELTBARBERSHOP')).not.toBe('Food & Dining');
    expect(autoCategorizeMerchant('BARBERIA CENTRAL')).not.toBe('Food & Dining');
  });

  it('still matches BAR as a whole word', () => {
    expect(autoCategorizeMerchant('BAR LA TERRAZA')).toBe('Food & Dining');
    expect(autoCategorizeMerchant('sushi bar')).toBe('Food & Dining');
    expect(autoCategorizeMerchant('LA BAR*PANAMA')).toBe('Food & Dining');
  });
});
