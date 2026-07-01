/**
 * Checks if a given date string or Date object falls within a specific predefined period.
 *
 * @param {string|Date} dateInput The date to check
 * @param {string} period The period (e.g., 'All Time', 'Today', 'Last 7 Days', 'This Month', 'This Year')
 * @returns {boolean} True if the date is within the period
 */
export const isWithinPeriod = (dateInput, period) => {
  if (!dateInput) return false;
  if (!period || period.toLowerCase() === 'all time') return true;

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false; // invalid date

  const now = new Date();
  const normalizedPeriod = period.toLowerCase();

  switch (normalizedPeriod) {
    case 'today': {
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }
    case 'last 7 days': {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return date >= sevenDaysAgo && date <= now;
    }
    case 'this month': {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    case 'this year': {
      return date.getFullYear() === now.getFullYear();
    }
    // Handle specific mappings for dashboard chart periods ('weekly', 'monthly', 'yearly')
    case 'weekly': {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo && date <= now;
    }
    case 'monthly': {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return date >= oneMonthAgo && date <= now;
    }
    case 'yearly': {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return date >= oneYearAgo && date <= now;
    }
    default:
      return true; // fallback to all time
  }
};
