/**
 * Currency Utility Functions for Backend
 * 
 * The database stores monetary values as integers (multiplied by 100) to avoid floating point errors.
 * For example: ₹125.50 is stored as 12550 in the database.
 * 
 * These utilities handle the conversion between:
 * - Display values (decimal, e.g., 125.50)
 * - Database values (integer, e.g., 12550)
 */

/**
 * Convert display decimal value to database integer value
 * Use this when SAVING data from frontend
 * @param {string|number} displayValue - Decimal value from user input (e.g., "125.50" or 125.5)
 * @returns {number|null} - Integer value for database (e.g., 12550) or null if empty
 */
const toDbValue = (displayValue) => {
    // Handle null, undefined, empty string, or whitespace
    if (displayValue === null || displayValue === undefined || displayValue === '' || 
        (typeof displayValue === 'string' && displayValue.trim() === '')) {
        return null;
    }
    const num = parseFloat(displayValue);
    // If parsing fails or results in NaN, return null
    if (isNaN(num)) {
        return null;
    }
    // Round to avoid floating point errors, then multiply by 100
    return Math.round(num * 100);
};

/**
 * Convert database integer value to display decimal value
 * Use this when FETCHING data for display (e.g., PDFs, reports)
 * @param {number|null} dbValue - Integer value from database (e.g., 12550) or null
 * @returns {string} - Formatted decimal string (e.g., "125.50") or empty string if null
 */
const fromDbValue = (dbValue) => {
    if (dbValue === null || dbValue === undefined) {
        return '';
    }
    const num = Number(dbValue) || 0;
    return (num / 100).toFixed(2);
};

/**
 * Convert database integer value to number for calculations
 * @param {number|null} dbValue - Integer value from database or null
 * @returns {number} - Decimal number for calculations (0 if null)
 */
const fromDbValueNum = (dbValue) => {
    if (dbValue === null || dbValue === undefined) {
        return 0;
    }
    const num = Number(dbValue) || 0;
    return num / 100;
};

/**
 * Format a database value for display with currency symbol
 * @param {number} dbValue - Integer value from database
 * @param {string} symbol - Currency symbol (default: "₹")
 * @returns {string} - Formatted currency string (e.g., "₹125.50")
 */
const formatCurrency = (dbValue, symbol = "₹") => {
    return `${symbol}${fromDbValue(dbValue)}`;
};

/**
 * Safe number conversion - ensures we get a valid number
 * @param {any} value - Value to convert
 * @returns {number} - Safe number value
 */
const safeNumber = (value) => Number(value) || 0;

module.exports = {
    toDbValue,
    fromDbValue,
    fromDbValueNum,
    formatCurrency,
    safeNumber
};
