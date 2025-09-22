/**
 * Formats a number with apostrophes as thousands separators and a specified number of decimal places.
 * @param {number | string | undefined | null} num - The number to format.
 * @param {number} [decimalPlaces=0] - The number of decimal places to show.
 * @returns {string} The formatted number string, or '0' if input is invalid.
 * @example formatNumber(12345.67, 2) // "12'345.67"
 */
export const formatNumber = (num: number | string | undefined | null, decimalPlaces: number = 0): string => {
    if (num === undefined || num === null) return '0';
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '0';
    
    const fixedNum = number.toFixed(decimalPlaces);
    const parts = fixedNum.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return parts.join('.');
};

/**
 * Parses a date string (YYYY-MM-DD or other ISO-like formats) into a Date object (UTC).
 * Returns null if the string is invalid or cannot be parsed.
 * @param {string | undefined | null} dateString - The date string to parse.
 * @returns {Date | null} The parsed Date object (in UTC) or null.
 */
export const parseDate = (dateString: string | undefined | null): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const date = new Date(Date.UTC(year, month, day));
         if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
      }
    }
    // Fallback for other ISO-like formats that Date constructor might handle
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Adds a specified number of months to a given date (UTC).
 * @param {Date} date - The starting date.
 * @param {number} months - The number of months to add (can be negative).
 * @returns {Date} A new Date object with the months added.
 */
export const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date); 
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
};

/**
 * Formats a Date object into a DD/MM/YYYY string.
 * Returns 'N/A' if the date is null or undefined.
 * @param {Date | null | undefined} date - The Date object to format.
 * @returns {string} The formatted date string or 'N/A'.
 */
export const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};


/**
 * Formats an ISO date string into a localized date and time string.
 * Returns 'N/A' if the input is null/undefined, or 'Invalid Date' if parsing fails.
 * @param {string | undefined | null} isoDateString - The ISO date string.
 * @returns {string} The formatted locale date-time string.
 */
export const formatDateTime = (isoDateString: string | undefined | null): string => {
    if (!isoDateString) return 'N/A';
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        // Using browser's default locale for formatting
        return date.toLocaleString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

/**
 * Gets the last moment (end of day) of a given month and year (UTC).
 * @param {number} year - The full year (e.g., 2024).
 * @param {number} month - The month, 0-indexed (0 for January, 11 for December).
 * @returns {Date} A Date object representing the end of the specified month.
 */
export const getMonthEnd = (year: number, month: number): Date => { // month is 0-indexed
    return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
};

/**
 * Calculates the number of full months between two dates, inclusive of start and end months.
 * Returns 0 if endDate is before startDate or if dates are invalid.
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {number} The number of months between the dates (inclusive).
 */
export const monthsBetween = (startDate: Date, endDate: Date): number => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    
    let months;
    months = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12;
    months -= startDate.getUTCMonth();
    months += endDate.getUTCMonth();
    
    // If the end day is before the start day in the final month, it's not a full month yet for some definitions.
    // However, for bonus amortization, if it's any part of the month, it's often counted.
    // The +1 makes it inclusive of start and end months if they are different.
    return months <= 0 ? (startDate.getUTCMonth() === endDate.getUTCMonth() && startDate.getUTCFullYear() === endDate.getUTCFullYear() ? 1 : 0) : months + 1;
};

/**
 * Calculates the number of days between two dates, inclusive.
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {number} The number of days between the dates.
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    const differenceInTime = endUTC - startUTC;
    return (differenceInTime / (1000 * 3600 * 24)) + 1;
};

/**
 * Gets the current period in YYYY-MM format.
 * @returns {string} The current period string.
 */
export const getCurrentPeriod = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

/**
 * Generates an array of years for dropdown selectors.
 * @param {number} [range=2] - The number of years to show before and after the current year.
 * @returns {number[]} An array of years.
 */
export const getYearOptions = (range: number = 2): number[] => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - range; i <= currentYear + range + 1; i++) { // +1 to include one more future year
        years.push(i);
    }
    return years;
};

/**
 * Generates an array of month options (value and label) for dropdown selectors.
 * Uses 'en-US' locale for English month names.
 * @returns {{ value: string, label: string }[]} An array of month objects.
 */
export const getMonthOptions = (): { value: string, label: string }[] => {
    return Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, '0'), // MM format
        label: new Date(0, i).toLocaleString('en-US', { month: 'long' }) // Full month name in English
    }));
};

/**
 * Formats a YYYY-MM period string into a "MonthName YYYY" string (e.g., "July 2024").
 * Uses 'en-US' locale for English month names.
 * @param {string} periodYYYYMM - The period string in YYYY-MM format.
 * @returns {string} The formatted period string for display.
 */
export const formatPeriodForDisplay = (periodYYYYMM: string): string => {
    if (!periodYYYYMM || periodYYYYMM.length !== 7 || !periodYYYYMM.includes('-')) return periodYYYYMM; // Basic validation
    const [yearStr, monthNumStr] = periodYYYYMM.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) return periodYYYYMM; // More validation

    // Create a date object (month is 0-indexed for Date constructor)
    const monthName = new Date(year, monthNum - 1).toLocaleString('en-US', { month: 'long' });
    return `${monthName} ${year}`;
};

/**
 * Generates an array of period strings (YYYY-MM) for initial setup.
 * @param {number} [numPast=6] - Number of past months to generate.
 * @param {number} [numFuture=6] - Number of future months to generate.
 * @returns {string[]} An array of period strings.
 */
export const generateInitialPeriods = (numPast: number = 6, numFuture: number = 6): string[] => {
    const periods: Set<string> = new Set();
    const currentDate = new Date();
    
    // Past periods
    for (let i = numPast; i > 0; i--) {
        const d = new Date(currentDate);
        d.setMonth(currentDate.getMonth() - i);
        periods.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    
    // Current period
    periods.add(getCurrentPeriod());

    // Future periods
    for (let i = 1; i <= numFuture; i++) {
        const d = new Date(currentDate);
        d.setMonth(currentDate.getMonth() + i);
        periods.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    return Array.from(periods).sort().reverse();
};

/**
 * Groups an array of period strings ("YYYY-MM") by year and sorts them.
 * @param {string[]} periods - An array of period strings.
 * @returns {{ [year: string]: string[] }} An object with years as keys and sorted period strings as values.
 */
export const groupAndSortPeriods = (periods: string[]): { [year: string]: string[] } => {
    const grouped: { [year: string]: string[] } = {};

    // Group by year
    for (const period of periods) {
        const year = period.substring(0, 4);
        if (!grouped[year]) {
            grouped[year] = [];
        }
        grouped[year].push(period);
    }

    // Sort periods within each year descending
    for (const year in grouped) {
        grouped[year].sort().reverse();
    }

    // Return the grouped object, keys will be sorted descending by the parent component
    return grouped;
};
