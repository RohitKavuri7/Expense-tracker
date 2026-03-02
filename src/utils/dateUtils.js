/**
 * Date parsing for agent: period names to { start, end } and phrase to YYYY-MM-DD.
 * All calculations done in code, not LLM.
 */

/**
 * Get start and end of "last month" in local time, as YYYY-MM-DD.
 * @returns {{ start: string, end: string }}
 */
export function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Get start and end of "this month" as YYYY-MM-DD.
 */
export function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

/**
 * @param {Date} d
 * @returns {string} YYYY-MM-DD
 */
export function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today in YYYY-MM-DD.
 */
export function getToday() {
  return formatDate(new Date());
}

/**
 * Parse a date phrase (from LLM or user) to YYYY-MM-DD.
 * Supports: "today", "yesterday", or ISO-like date string.
 * @param {string} [phrase]
 * @returns {string} YYYY-MM-DD
 */
export function parseDatePhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return getToday();
  const trimmed = phrase.trim().toLowerCase();
  const today = new Date();
  if (trimmed === 'today') return formatDate(today);
  if (trimmed === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }

  // "last month 15th", "this month on 2nd", "15th of last month"
  let relMatch = trimmed.match(/\b(last|this)\s+month(?:\s+on)?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!relMatch) {
    relMatch = trimmed.match(/\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(last|this)\s+month\b/);
    if (relMatch) relMatch = [relMatch[0], relMatch[2], relMatch[1]];
  }
  if (relMatch) {
    const rel = relMatch[1];
    const day = Number(relMatch[2]);
    const baseYear = today.getFullYear();
    const baseMonth = today.getMonth();
    const targetMonth = rel === 'last' ? baseMonth - 1 : baseMonth;
    const parsed = new Date(baseYear, targetMonth, day);
    if (parsed.getDate() === day) return formatDate(parsed);
  }

  // Accept YYYY-MM-DD anywhere in phrase
  const isoMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const parsed = new Date(y, m - 1, d);
    if (parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d) {
      return formatDate(parsed);
    }
  }

  // Accept MM/DD/YY or MM/DD/YYYY (and with '-')
  const mdYMatch = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mdYMatch) {
    const month = Number(mdYMatch[1]);
    const day = Number(mdYMatch[2]);
    let year = Number(mdYMatch[3]);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return formatDate(parsed);
    }
  }

  const monthIndex = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // "feb 24 2026", "feb 24", "february 2nd"
  const monthFirst = trimmed.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\b/);
  if (monthFirst) {
    const month = monthIndex[monthFirst[1]];
    const day = Number(monthFirst[2]);
    let year = monthFirst[3] ? Number(monthFirst[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return formatDate(parsed);
    }
  }

  // "24 feb 2026", "2nd march"
  const dayFirst = trimmed.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:,?\s+(\d{2,4}))?\b/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = monthIndex[dayFirst[2]];
    let year = dayFirst[3] ? Number(dayFirst[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return formatDate(parsed);
    }
  }

  return getToday();
}
