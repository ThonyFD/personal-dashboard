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

describe('autoCategorizeMerchant Panama chains', () => {
  it.each([
    ['TH 0001 TIM HORTONS', 'Food & Dining'],
    ['POPEYES MALL', 'Food & Dining'],
    ['PF CHANG', 'Food & Dining'],
    ['AJISEN RAMEN', 'Food & Dining'],
    ['DIM SUM PALACE', 'Food & Dining'],
    ['PIO PIO CENTRO', 'Food & Dining'],
    ['DAIRY QUEEN MARKET', 'Food & Dining'],
    ['DON LEE CENTRO', 'Food & Dining'],
    ['FONDA', 'Food & Dining'],
    ['GELARTI CENTRO', 'Food & Dining'],
    ['REFRESQUERIA CENTRO', 'Food & Dining'],
    ['CHICKEN SABROSO', 'Food & Dining'],
    ["WENDY'S MALL", 'Food & Dining'],
    ['CINNABON MALL', 'Food & Dining'],
    ['PRICESMART CENTRO', 'Groceries'],
    ['REY CENTRO 1001', 'Groceries'],
    ['ABARROTERIA LA ESQUINA', 'Groceries'],
    ['90000000TERPEL EDS', 'Transportation'],
    ['JMJ PUMA CENTRO', 'Transportation'],
    ['PUMA ESTACION CENTRO', 'Transportation'],
    ['DELTA-CENTRO', 'Transportation'],
    ['ESTACION TEXACO CENTRO', 'Transportation'],
    ['ESTACION VENTURO', 'Transportation'],
    ['PREMIUM WASH CENTRO', 'Transportation'],
    ['CINEPOLIS WEB', 'Entertainment'],
    ['TICKETPLUS', 'Entertainment'],
    ['PANATICKETS -I-', 'Entertainment'],
    ['CONWAY MALL', 'Shopping'],
    ['MULTIMAX CENTRO', 'Shopping'],
    ['OUTDOORS ADVENTURE', 'Shopping'],
    ['Tigo Autopay Hogar/', 'Bills & Utilities'],
    ['ASSACIASEGUROS PAGOPAG', 'Bills & Utilities'],
    ['MAPFRE PANAMA S.A', 'Bills & Utilities'],
    ['FARMACIA CENTRO', 'Healthcare'],
    ['PHARMA', 'Healthcare'],
    ['FARMA VALUE CENTRO', 'Healthcare'],
    ['MINIMED CENTRO', 'Healthcare'],
    ['NOVEY CENTRO', 'Home Care'],
    ['DO IT CENTER MALL', 'Home Care'],
    ['ROOSEVELTBARBERSHOP', 'Services'],
    ['UNIVERSIDAD NACIONAL', 'Education'],
    ['OPENAI *CHATGPT SUB', 'Subscriptions'],
    ['GOOGLE *ChatGPT', 'Subscriptions'],
    ['ANTHROPIC* CLAUDE S', 'Subscriptions'],
    ['GOOGLE *Google One', 'Subscriptions'],
    ['GOOGLE *CLOUD ABC12', 'Subscriptions'],
    ['APPLE.COM BILL', 'Subscriptions'],
    ['Google Crunchyroll An', 'Entertainment'],
    ['ASSA VIDA', 'Bills & Utilities'],
    ['DAY SPA CENTRAL', 'Services'],
  ])('%s is %s', (merchant, category) => {
    expect(autoCategorizeMerchant(merchant)).toBe(category);
  });

  it('does not match the new keywords inside other words', () => {
    expect(autoCategorizeMerchant('SACRAMENTO DELI')).not.toBe('Food & Dining');
    expect(autoCategorizeMerchant('DELTA AIRLINES')).toBe('Travel');
    expect(autoCategorizeMerchant('MASSAGE CENTRAL')).not.toBe('Bills & Utilities');
    expect(autoCategorizeMerchant('PEDRO ASSAD')).not.toBe('Bills & Utilities');
    expect(autoCategorizeMerchant('TIENDA ESPANA')).not.toBe('Services');
    expect(autoCategorizeMerchant('CONTIGO TIENDA')).not.toBe('Bills & Utilities');
    expect(autoCategorizeMerchant('LA FONDANT')).not.toBe('Food & Dining');
    expect(autoCategorizeMerchant('AEROREPUBLICA')).not.toBe('Food & Dining');
    expect(autoCategorizeMerchant('BACK OFFICE GASTRONOMIA')).not.toBe('Transportation');
    expect(autoCategorizeMerchant('ACME CUSTOMS BROKERAGE')).not.toBe('Investment');
  });

  it('keeps the whole-word versions of the tightened keywords', () => {
    expect(autoCategorizeMerchant('IRISH PUB')).toBe('Food & Dining');
    expect(autoCategorizeMerchant('GAS STATION 24')).toBe('Transportation');
    expect(autoCategorizeMerchant('GASOLINERA CENTRO')).toBe('Transportation');
    expect(autoCategorizeMerchant('ACME BROKER')).toBe('Investment');
  });
});
