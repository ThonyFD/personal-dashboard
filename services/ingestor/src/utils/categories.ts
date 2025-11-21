/**
 * Merchant auto-categorization utility
 * Based on merchant name patterns
 */

export type Category =
  | 'Food & Dining'
  | 'Groceries'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills & Utilities'
  | 'Healthcare'
  | 'Travel'
  | 'Education'
  | 'Services'
  | 'Subscriptions'
  | 'Transfers'
  | 'Investment'
  | 'Pago Mensual'
  | 'Other';

/**
 * Auto-categorize a merchant based on name patterns
 */
export function autoCategorizeMerchant(merchantName: string): Category {
  const name = merchantName.toUpperCase();

  // Food & Dining
  if (
    name.includes('RESTAURANT') ||
    name.includes('COFFEE') ||
    name.includes('CAFE') ||
    name.includes('PIZZA') ||
    name.includes('BURGER') ||
    name.includes('FOOD') ||
    name.includes('MCDONALD') ||
    name.includes('KFC') ||
    name.includes('SUBWAY') ||
    name.includes('STARBUCKS') ||
    name.includes('DUNKIN') ||
    name.includes('WENDYS') ||
    name.includes('TACO') ||
    name.includes('SUSHI') ||
    name.includes('GRILL') ||
    name.includes('BISTRO') ||
    name.includes('DINER') ||
    name.includes('BAKERY') ||
    name.includes('BAR') ||
    name.includes('PUB') ||
    name.includes('GEISHA') ||
    name.includes('LOTUS HOUSE')
  ) {
    return 'Food & Dining';
  }

  // Groceries
  if (
    name.includes('SUPER') ||
    name.includes('MARKET') ||
    name.includes('GROCERY') ||
    name.includes('WALMART') ||
    name.includes('TARGET') ||
    name.includes('COSTCO') ||
    name.includes('RIBA SMITH') ||
    name.includes('EL REY') ||
    name.includes('XTRA')
  ) {
    return 'Groceries';
  }

  // Transportation
  if (
    name.includes('UBER') ||
    name.includes('LYFT') ||
    name.includes('TAXI') ||
    name.includes('GAS') ||
    name.includes('FUEL') ||
    name.includes('PARKING') ||
    name.includes('TOLL') ||
    name.includes('METRO') ||
    name.includes('BUS') ||
    name.includes('CABIFY') ||
    name.includes('SHELL') ||
    name.includes('CHEVRON') ||
    name.includes('PUMA ENERGY')
  ) {
    return 'Transportation';
  }

  // Entertainment
  if (
    name.includes('NETFLIX') ||
    name.includes('SPOTIFY') ||
    name.includes('HULU') ||
    name.includes('DISNEY') ||
    name.includes('HBO') ||
    name.includes('PRIME VIDEO') ||
    name.includes('CINEMA') ||
    name.includes('MOVIE') ||
    name.includes('THEATER') ||
    name.includes('PLAYSTATION') ||
    name.includes('XBOX') ||
    name.includes('NINTENDO') ||
    name.includes('STEAM') ||
    name.includes('GAME')
  ) {
    return 'Entertainment';
  }

  // Shopping
  if (
    name.includes('AMAZON') ||
    name.includes('EBAY') ||
    name.includes('STORE') ||
    name.includes('SHOP') ||
    name.includes('RETAIL') ||
    name.includes('CLOTHING') ||
    name.includes('FASHION') ||
    name.includes('NIKE') ||
    name.includes('ADIDAS') ||
    name.includes('ZARA') ||
    name.includes('H&M')
  ) {
    return 'Shopping';
  }

  // Bills & Utilities
  if (
    name.includes('ELECTRIC') ||
    name.includes('WATER') ||
    name.includes('INTERNET') ||
    name.includes('PHONE') ||
    name.includes('CABLE') ||
    name.includes('UTILITY') ||
    name.includes('CWP') ||
    name.includes('AES') ||
    name.includes('IDAAN')
  ) {
    return 'Bills & Utilities';
  }

  // Healthcare
  if (
    name.includes('HOSPITAL') ||
    name.includes('CLINIC') ||
    name.includes('PHARMACY') ||
    name.includes('DOCTOR') ||
    name.includes('MEDICAL') ||
    name.includes('HEALTH') ||
    name.includes('DENTAL') ||
    name.includes('CVS') ||
    name.includes('WALGREENS') ||
    name.includes('FARMACIAS')
  ) {
    return 'Healthcare';
  }

  // Travel
  if (
    name.includes('HOTEL') ||
    name.includes('AIRLINE') ||
    name.includes('FLIGHT') ||
    name.includes('AIRBNB') ||
    name.includes('BOOKING') ||
    name.includes('EXPEDIA') ||
    name.includes('TRAVEL') ||
    name.includes('RESORT') ||
    name.includes('COPA AIRLINES') ||
    name.includes('AVIANCA')
  ) {
    return 'Travel';
  }

  // Education
  if (
    name.includes('SCHOOL') ||
    name.includes('UNIVERSITY') ||
    name.includes('COLLEGE') ||
    name.includes('EDUCATION') ||
    name.includes('COURSE') ||
    name.includes('TUITION') ||
    name.includes('UDEMY') ||
    name.includes('COURSERA')
  ) {
    return 'Education';
  }

  // Investment
  if (
    name.includes('ADMIRAL') ||
    name.includes('MARKETS') ||
    name.includes('TRADING') ||
    name.includes('BROKER') ||
    name.includes('INVEST') ||
    name.includes('SECURITIES') ||
    name.includes('STOCK') ||
    name.includes('CRYPTO') ||
    name.includes('BINANCE') ||
    name.includes('COINBASE') ||
    name.includes('ETORO') ||
    name.includes('ROBINHOOD') ||
    name.includes('FIDELITY')
  ) {
    return 'Investment';
  }

  // Subscriptions
  if (
    name.includes('SUBSCRIPTION') ||
    name.includes('MONTHLY') ||
    name.includes('MEMBERSHIP')
  ) {
    return 'Subscriptions';
  }

  // Pago Mensual (Loan payments, mortgages, financing)
  if (
    name.includes('LOAN PAYMENT') ||
    name.includes('LOAN') ||
    name.includes('MORTGAGE') ||
    name.includes('FINANCING') ||
    name.includes('CUOTA') ||
    name.includes('PRESTAMO') ||
    name.includes('FINANCIAMIENTO')
  ) {
    return 'Pago Mensual';
  }

  // Transfers
  if (
    name.includes('TRANSFER') ||
    name.includes('PAYMENT') ||
    name.includes('YAPPY') ||
    name.includes('NEQUI') ||
    name.includes('TRANSFIYA')
  ) {
    return 'Transfers';
  }

  // Services (general services)
  if (
    name.includes('SERVICE') ||
    name.includes('REPAIR') ||
    name.includes('CLEANING') ||
    name.includes('SALON') ||
    name.includes('SPA')
  ) {
    return 'Services';
  }

  return 'Other';
}
