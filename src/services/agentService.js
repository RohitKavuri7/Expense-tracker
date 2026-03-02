/**
 * Agent logic: all calculations in our code (no LLM).
 * - Fetch expenses, overspend by category, predictions/trends data.
 */
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getLastMonthRange, getThisMonthRange, parseDatePhrase, getToday, formatDate } from '../utils/dateUtils';
import { mapToAppCategory } from '../constants/categories';
import { addExpense } from './expenseService';
import { updateMonthlyStatsForExpenseWrite } from './monthlyStatsService';

/**
 * @param {string} uid
 * @returns {Promise<Array<{ id: string, amount: number, category: string, date: string }>>}
 */
export async function fetchUserExpenses(uid) {
  const q = query(collection(db, 'expenses'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Filter expenses by date range (inclusive). date field is YYYY-MM-DD string.
 */
function filterByDateRange(expenses, start, end) {
  return expenses.filter((e) => {
    const d = e.date;
    if (!d) return false;
    return d >= start && d <= end;
  });
}

/**
 * Aggregate by category: { Food: 100, Transport: 50, ... }
 */
function aggregateByCategory(expenses) {
  const byCategory = {};
  for (const e of expenses) {
    const cat = e.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
  }
  return byCategory;
}

/**
 * Overspend = category where user spent the MOST in the period (no budget).
 * @param {string} uid
 * @param {'last_month'|'this_month'} period
 * @returns {Promise<{ category: string, total: number, byCategory: object }>}
 */
export async function getOverspendForPeriod(uid, period) {
  const expenses = await fetchUserExpenses(uid);
  const range = period === 'this_month' ? getThisMonthRange() : getLastMonthRange();
  const filtered = filterByDateRange(expenses, range.start, range.end);
  const byCategory = aggregateByCategory(filtered);
  let category = 'Other';
  let total = 0;
  for (const [cat, sum] of Object.entries(byCategory)) {
    if (sum > total) {
      total = sum;
      category = cat;
    }
  }
  return { category, total, byCategory, start: range.start, end: range.end };
}

/**
 * Predictions data: category totals, simple trends (vs previous month), and a suggested reduction.
 * All computed here; LLM only phrases it.
 * @param {string} uid
 * @returns {Promise<{ byCategory: object, lastMonthTotal: number, trends: Array<{ category: string, changePercent: number }>, suggestedReduce: { category: string, amount: number } }>}
 */
export async function getPredictionsData(uid) {
  const expenses = await fetchUserExpenses(uid);
  const now = new Date();
  const thisMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const lastMonthStart = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));

  const thisMonth = filterByDateRange(expenses, thisMonthStart, thisMonthEnd);
  const lastMonth = filterByDateRange(expenses, lastMonthStart, lastMonthEnd);

  const byCategoryThis = aggregateByCategory(thisMonth);
  const byCategoryLast = aggregateByCategory(lastMonth);
  const lastMonthTotal = Object.values(byCategoryLast).reduce((a, b) => a + b, 0);

  const trends = [];
  const allCategories = new Set([...Object.keys(byCategoryThis), ...Object.keys(byCategoryLast)]);
  for (const cat of allCategories) {
    const thisVal = byCategoryThis[cat] || 0;
    const lastVal = byCategoryLast[cat] || 0;
    const changePercent = lastVal === 0 ? (thisVal > 0 ? 100 : 0) : ((thisVal - lastVal) / lastVal) * 100;
    trends.push({ category: cat, thisMonth: thisVal, lastMonth: lastVal, changePercent });
  }
  trends.sort((a, b) => b.thisMonth - a.thisMonth);

  // Suggested reduction: category with highest spend this month (user could reduce that)
  let suggestedReduce = { category: 'Other', amount: 0 };
  const topCategory = trends[0];
  if (topCategory && topCategory.thisMonth > 0) {
    suggestedReduce = { category: topCategory.category, amount: Math.round(topCategory.thisMonth * 0.2 * 100) / 100 };
  }

  return {
    byCategory: byCategoryThis,
    lastMonthTotal,
    thisMonthTotal: Object.values(byCategoryThis).reduce((a, b) => a + b, 0),
    trends,
    suggestedReduce,
  };
}

/**
 * Add expense from parsed message. Maps category to app category, parses date, uses expenseService.
 * @param {{ amount: number, categoryPhrase: string, datePhrase?: string }} parsed
 * @param {{ uid: string }} user
 * @returns {Promise<{ success: true, message: string }|{ success: false, error: string }>}
 */
export async function addExpenseFromMessage(parsed, user) {
  const amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount.' };
  }
  const category = mapToAppCategory(parsed.categoryPhrase || '');
  const date = parseDatePhrase(parsed.datePhrase);
  const today = getToday();
  if (date > today) {
    return { success: false, error: 'Expense date cannot be in the future.' };
  }
  const name = (parsed.categoryPhrase && parsed.categoryPhrase.trim()) ? parsed.categoryPhrase.trim() : category;
  try {
    await addExpense({
      name,
      amount,
      category,
      date,
      uid: user.uid,
      sharedWith: [],
      receiptURL: '',
    });
    return { success: true, message: `Added $${amount.toFixed(2)} under ${category}.` };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to add expense.' };
  }
}

/**
 * Delete all expenses for the user.
 * @param {string} uid
 * @returns {Promise<{ count: number }>}
 */
export async function deleteAllExpenses(uid) {
  const expenses = await fetchUserExpenses(uid);
  const touchedDates = new Set();
  let count = 0;
  for (const e of expenses) {
    await deleteDoc(doc(db, 'expenses', e.id));
    if (e.date) touchedDates.add(e.date);
    count += 1;
  }
  for (const d of touchedDates) {
    try {
      await updateMonthlyStatsForExpenseWrite(uid, d);
    } catch (_) {
      // Stats are derived/optional; do not block delete.
    }
  }
  return { count };
}

/**
 * Get total spending for a period.
 * @param {string} uid
 * @param {'last_month'|'this_month'|'all'} period
 * @returns {Promise<{ total: number, period: string }>}
 */
export async function getTotalForPeriod(uid, period) {
  const expenses = await fetchUserExpenses(uid);
  let filtered = expenses;
  if (period !== 'all') {
    const range = period === 'this_month' ? getThisMonthRange() : getLastMonthRange();
    filtered = filterByDateRange(expenses, range.start, range.end);
  }
  const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  return { total, period };
}

/**
 * Get budget and compare to current spending (this month).
 * @param {string} uid
 * @returns {Promise<{ budget: number|null, total: number, over: boolean }>}
 */
export async function getBudgetStatus(uid) {
  const budgetRef = doc(db, 'budgets', uid);
  const budgetSnap = await getDoc(budgetRef);
  const budget = budgetSnap.exists() ? budgetSnap.data().budget : null;
  const expenses = await fetchUserExpenses(uid);
  const range = getThisMonthRange();
  const thisMonth = filterByDateRange(expenses, range.start, range.end);
  const total = thisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
  const over = budget != null && total > budget;
  return { budget, total, over };
}

/**
 * Set monthly budget for user (same structure as BudgetForm).
 * @param {string} uid
 * @param {number|string} amount
 * @returns {Promise<{ success: boolean, budget?: number, error?: string }>}
 */
export async function setBudgetForUser(uid, amount) {
  const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return { success: false, error: 'Invalid budget amount.' };
  }
  await setDoc(doc(db, 'budgets', uid), { budget: parsed });
  return { success: true, budget: parsed };
}

function rangeForPeriod(period) {
  if (period === 'this_month') return getThisMonthRange();
  if (period === 'last_month') return getLastMonthRange();
  return null;
}

/**
 * Fetch expenses in a specific period or all-time.
 * @param {string} uid
 * @param {'this_month'|'last_month'|'all'} period
 */
export async function getExpensesForPeriod(uid, period = 'all') {
  const expenses = await fetchUserExpenses(uid);
  const range = rangeForPeriod(period);
  if (!range) return expenses;
  return filterByDateRange(expenses, range.start, range.end);
}

/**
 * Highest single expense in a period.
 * @param {string} uid
 * @param {'this_month'|'last_month'|'all'} period
 */
export async function getHighestExpense(uid, period = 'this_month') {
  const expenses = await getExpensesForPeriod(uid, period);
  if (!expenses.length) return { expense: null, period };
  const sorted = [...expenses].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  return { expense: sorted[0], period };
}

/**
 * Category deltas this month vs last month.
 * @param {string} uid
 */
export async function getCategoryIncreaseComparedToLastMonth(uid) {
  const expenses = await fetchUserExpenses(uid);
  const thisRange = getThisMonthRange();
  const lastRange = getLastMonthRange();
  const thisMonth = aggregateByCategory(filterByDateRange(expenses, thisRange.start, thisRange.end));
  const lastMonth = aggregateByCategory(filterByDateRange(expenses, lastRange.start, lastRange.end));

  const allCats = new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)]);
  const increases = [];
  allCats.forEach((category) => {
    const current = thisMonth[category] || 0;
    const previous = lastMonth[category] || 0;
    const delta = current - previous;
    if (delta > 0) {
      const changePercent = previous === 0 ? 100 : (delta / previous) * 100;
      increases.push({ category, current, previous, delta, changePercent });
    }
  });
  increases.sort((a, b) => b.delta - a.delta);
  return { increases };
}

/**
 * Dataset summary for LLM reasoning (no writes).
 * @param {string} uid
 */
export async function getExpenseDatasetSummary(uid) {
  const expenses = await fetchUserExpenses(uid);
  const thisMonth = await getExpensesForPeriod(uid, 'this_month');
  const lastMonth = await getExpensesForPeriod(uid, 'last_month');
  const byCategoryThisMonth = aggregateByCategory(thisMonth);
  const byCategoryLastMonth = aggregateByCategory(lastMonth);
  const totalAllTime = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalThisMonth = thisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLastMonth = lastMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
  const recentExpenses = [...expenses]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      category: e.category,
      date: e.date,
    }));

  return {
    counts: {
      allTime: expenses.length,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
    },
    totals: {
      allTime: totalAllTime,
      thisMonth: totalThisMonth,
      lastMonth: totalLastMonth,
    },
    byCategory: {
      thisMonth: byCategoryThisMonth,
      lastMonth: byCategoryLastMonth,
    },
    recentExpenses,
  };
}

async function getMonthlyStats(uid, yearMonth) {
  try {
    const statsId = `${uid}_${yearMonth}`;
    const snap = await getDoc(doc(db, 'userMonthlyStats', statsId));
    if (!snap.exists()) {
      return {
        uid,
        yearMonth,
        total: 0,
        expenseCount: 0,
        categoryBreakdown: {},
        largestExpense: null,
      };
    }
    return snap.data();
  } catch (_) {
    // Derived stats are optional; caller should fallback to direct expense scan.
    return null;
  }
}

/**
 * Forecast total spend for current month using daily velocity so far.
 * @param {string} uid
 */
export async function getMonthlyForecast(uid) {
  const today = new Date();
  const yearMonth = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}`;
  let stats = await getMonthlyStats(uid, yearMonth);
  if (!stats) {
    const thisMonthExpenses = await getExpensesForPeriod(uid, 'this_month');
    const fallbackTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    stats = {
      uid,
      yearMonth,
      total: fallbackTotal,
      expenseCount: thisMonthExpenses.length,
      categoryBreakdown: aggregateByCategory(thisMonthExpenses),
      largestExpense: null,
    };
  }
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyVelocity = daysElapsed > 0 ? Number(stats.total || 0) / daysElapsed : 0;
  const projectedTotal = Math.round(dailyVelocity * daysInMonth * 100) / 100;
  return {
    yearMonth,
    currentTotal: Number(stats.total || 0),
    dailyVelocity,
    projectedTotal,
    daysElapsed,
    daysInMonth,
  };
}

/**
 * Behavioral insights from historical expense data.
 * - weekend spikes
 * - rising categories
 * - frequent small purchases
 * @param {string} uid
 */
export async function getBehaviorInsights(uid) {
  const expenses = await fetchUserExpenses(uid);
  const smallThreshold = 20;
  let weekendTotal = 0;
  let weekdayTotal = 0;
  let weekendCount = 0;
  let weekdayCount = 0;
  let smallPurchaseCount = 0;

  expenses.forEach((e) => {
    const amount = Number(e.amount || 0);
    const d = new Date(`${e.date}T00:00:00`);
    const day = d.getDay(); // 0 Sunday, 6 Saturday
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      weekendTotal += amount;
      weekendCount += 1;
    } else {
      weekdayTotal += amount;
      weekdayCount += 1;
    }
    if (amount > 0 && amount <= smallThreshold) smallPurchaseCount += 1;
  });

  const weekendAvg = weekendCount ? weekendTotal / weekendCount : 0;
  const weekdayAvg = weekdayCount ? weekdayTotal / weekdayCount : 0;
  const weekendSpike = weekendAvg > weekdayAvg * 1.2;

  const risingData = await getCategoryIncreaseComparedToLastMonth(uid);
  const risingCategories = risingData.increases.slice(0, 3);
  const smallPurchaseRatio = expenses.length ? smallPurchaseCount / expenses.length : 0;

  return {
    weekendSpike,
    weekendAverage: weekendAvg,
    weekdayAverage: weekdayAvg,
    risingCategories,
    smallPurchaseCount,
    smallPurchaseRatio,
    totalExpenses: expenses.length,
  };
}

/**
 * Financial health score (0-100) based on:
 * - budget adherence
 * - top category concentration
 * - month-over-month growth
 * @param {string} uid
 */
export async function getFinancialHealthScore(uid) {
  const now = new Date();
  const thisYm = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYm = `${lastDate.getFullYear()}_${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
  let thisStats = await getMonthlyStats(uid, thisYm);
  let lastStats = await getMonthlyStats(uid, lastYm);
  if (!thisStats) {
    const thisMonthExpenses = await getExpensesForPeriod(uid, 'this_month');
    thisStats = {
      total: thisMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
      categoryBreakdown: aggregateByCategory(thisMonthExpenses),
    };
  }
  if (!lastStats) {
    const lastMonthExpenses = await getExpensesForPeriod(uid, 'last_month');
    lastStats = {
      total: lastMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
      categoryBreakdown: aggregateByCategory(lastMonthExpenses),
    };
  }
  const budgetData = await getBudgetStatus(uid);

  let score = 100;
  const thisTotal = Number(thisStats.total || 0);
  const lastTotal = Number(lastStats.total || 0);

  // Budget adherence (max -40)
  if (budgetData.budget != null && budgetData.budget > 0) {
    const overRatio = Math.max(0, (thisTotal - budgetData.budget) / budgetData.budget);
    score -= Math.min(40, overRatio * 100);
  }

  // Category concentration (max -30)
  const categories = Object.values(thisStats.categoryBreakdown || {});
  const topCategory = categories.length ? Math.max(...categories) : 0;
  const topCategoryShare = thisTotal > 0 ? topCategory / thisTotal : 0;
  if (topCategoryShare > 0.5) {
    score -= Math.min(30, (topCategoryShare - 0.5) * 100);
  }

  // Growth rate (max -30 if spending jumps)
  if (lastTotal > 0) {
    const growth = (thisTotal - lastTotal) / lastTotal;
    if (growth > 0) score -= Math.min(30, growth * 50);
  }

  score = Math.max(0, Math.round(score));
  return {
    score,
    factors: {
      budget: {
        budget: budgetData.budget,
        spent: thisTotal,
      },
      topCategoryShare,
      monthOverMonthGrowth: lastTotal > 0 ? (thisTotal - lastTotal) / lastTotal : 0,
    },
  };
}

/**
 * Agent observability log.
 * @param {string} uid
 * @param {string} action
 * @param {number} latencyMs
 * @param {boolean} fallbackUsed
 */
export async function logAgentEvent(uid, action, latencyMs, fallbackUsed) {
  await addDoc(collection(db, 'agentLogs'), {
    uid,
    action,
    latencyMs: Number(latencyMs || 0),
    fallbackUsed: Boolean(fallbackUsed),
    timestamp: serverTimestamp(),
  });
}
