/**
 * Checks if a given date string or Date object falls within a specific predefined period.
 *
 * @param {string|Date} dateInput The date to check
 * @param {string} period The period (e.g., 'All Time', 'Today', 'Last 7 Days', 'This Month', 'This Year')
 * @param {object} customRange { from: string, to: string } (YYYY-MM-DD)
 * @returns {boolean} True if the date is within the period
 */
export const isWithinPeriod = (dateInput, period, customRange = null) => {
  if (!dateInput) return false;
  if (!period || period.toLowerCase() === 'all time') return true;

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false; // invalid date

  // Reset date hours to 00:00:00 for accurate day comparisons
  const dateStr = date.toISOString().split('T')[0];
  const compareDate = new Date(`${dateStr}T00:00:00`);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const today = new Date(`${todayStr}T00:00:00`);

  const normalizedPeriod = period.toLowerCase();

  switch (normalizedPeriod) {
    case 'today': {
      return compareDate.getTime() === today.getTime();
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return compareDate.getTime() === yesterday.getTime();
    }
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return compareDate.getTime() === tomorrow.getTime();
    }
    case 'last 7 days': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Includes today (7 days total)
      return compareDate >= sevenDaysAgo && compareDate <= today;
    }
    case 'next 7 days': {
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 6);
      return compareDate >= today && compareDate <= sevenDaysFromNow;
    }
    case 'last 30 days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      return compareDate >= thirtyDaysAgo && compareDate <= today;
    }
    case 'this week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      return compareDate >= startOfWeek && compareDate <= endOfWeek;
    }
    case 'this month': {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    case 'last month': {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return (
        date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
      );
    }
    case 'this year': {
      return date.getFullYear() === now.getFullYear();
    }
    case 'custom range':
    case 'custom': {
      if (!customRange || (!customRange.from && !customRange.to)) return true;
      let isAfterFrom = true;
      let isBeforeTo = true;

      if (customRange.from) {
        const fromDate = new Date(`${customRange.from}T00:00:00`);
        if (!isNaN(fromDate.getTime())) {
          isAfterFrom = compareDate >= fromDate;
        }
      }

      if (customRange.to) {
        const toDate = new Date(`${customRange.to}T00:00:00`);
        if (!isNaN(toDate.getTime())) {
          isBeforeTo = compareDate <= toDate;
        }
      }

      return isAfterFrom && isBeforeTo;
    }
    // Handle specific mappings for dashboard chart periods ('weekly', 'monthly', 'yearly')
    case 'weekly': {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return compareDate >= oneWeekAgo && compareDate <= today;
    }
    case 'monthly': {
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      return compareDate >= oneMonthAgo && compareDate <= today;
    }
    case 'yearly': {
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return compareDate >= oneYearAgo && compareDate <= today;
    }
    default:
      return true; // fallback to all time
  }
};
