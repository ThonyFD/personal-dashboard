import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears, format } from 'date-fns';

export type PeriodType = 'week' | 'month' | 'year';

export interface DateRange {
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string;   // ISO format YYYY-MM-DD
  label: string;     // Display label
}

/**
 * Get date range for a specific period type and offset
 * @param periodType - 'week', 'month', or 'year'
 * @param offset - Number of periods to go back (0 = current, 1 = previous, etc.)
 * @returns DateRange object with start date, end date, and label
 */
export function getDateRange(periodType: PeriodType, offset: number = 0): DateRange {
  const now = new Date();
  let referenceDate = now;

  // Calculate reference date based on offset
  if (offset > 0) {
    switch (periodType) {
      case 'week':
        referenceDate = subWeeks(now, offset);
        break;
      case 'month':
        referenceDate = subMonths(now, offset);
        break;
      case 'year':
        referenceDate = subYears(now, offset);
        break;
    }
  }

  let start: Date;
  let end: Date;
  let label: string;

  switch (periodType) {
    case 'week':
      // Week starts on Monday
      start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      if (offset === 0) {
        label = 'This Week';
      } else if (offset === 1) {
        label = 'Last Week';
      } else {
        label = `Week of ${format(start, 'MMM dd')}`;
      }
      break;

    case 'month':
      start = startOfMonth(referenceDate);
      end = endOfMonth(referenceDate);
      if (offset === 0) {
        label = 'This Month';
      } else if (offset === 1) {
        label = 'Last Month';
      } else {
        label = format(start, 'MMMM yyyy');
      }
      break;

    case 'year':
      start = startOfYear(referenceDate);
      end = endOfYear(referenceDate);
      if (offset === 0) {
        label = 'This Year';
      } else if (offset === 1) {
        label = 'Last Year';
      } else {
        label = format(start, 'yyyy');
      }
      break;
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    label,
  };
}

/**
 * Get quick access date ranges
 */
export function getQuickDateRanges(): Record<string, DateRange> {
  return {
    thisWeek: getDateRange('week', 0),
    lastWeek: getDateRange('week', 1),
    thisMonth: getDateRange('month', 0),
    lastMonth: getDateRange('month', 1),
    thisYear: getDateRange('year', 0),
    lastYear: getDateRange('year', 1),
  };
}
