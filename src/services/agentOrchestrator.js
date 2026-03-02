import {
  addExpenseFromMessage,
  deleteAllExpenses,
  getBehaviorInsights,
  getBudgetStatus,
  getCategoryIncreaseComparedToLastMonth,
  getExpenseDatasetSummary,
  getFinancialHealthScore,
  getHighestExpense,
  getMonthlyForecast,
  getOverspendForPeriod,
  getPredictionsData,
  getTotalForPeriod,
  logAgentEvent,
  setBudgetForUser,
} from './agentService';
import { decideAgentAction } from './llmService';

function safePeriod(period, defaultValue = 'this_month') {
  if (period === 'this_month' || period === 'last_month' || period === 'all') return period;
  return defaultValue;
}

function isDeleteAllRequest(text) {
  const lower = (text || '').toLowerCase();
  return /\b(delete|remove|clear)\b/.test(lower) && /\ball\b/.test(lower) && /\bexpenses?\b/.test(lower);
}

function extractDatePhraseFromText(text) {
  if (/\byesterday\b/.test(text)) return 'yesterday';
  if (/\btoday\b/.test(text)) return 'today';
  const relative = text.match(/\b(?:last|this)\s+month(?:\s+on)?\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}(?:st|nd|rd|th)?(?:\s+of)?\s+(?:last|this)\s+month\b/);
  if (relative) return relative[0];
  const numeric = text.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/);
  if (numeric) return numeric[0];
  const monthName = text.match(/\b(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:,?\s+\d{2,4})?\b/);
  if (monthName) return monthName[0];
  return null;
}

function detectLocalRoute(message) {
  const text = (message || '').toLowerCase();
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  const categoryMatch = text.match(/\b(?:on|for)\s+([a-z]+)/i);
  const datePhrase = extractDatePhraseFromText(text);

  if (isDeleteAllRequest(text)) return { action: 'delete_all_expenses', args: { confirm: true } };
  if (amountMatch && categoryMatch) {
    return {
      action: 'add_expense',
      args: {
        amount: Number(amountMatch[1]),
        categoryPhrase: categoryMatch[1],
        datePhrase: datePhrase || 'today',
      },
    };
  }
  if (text.includes('highest expense') || text.includes('largest expense')) {
    return { action: 'get_highest_expense', args: { period: text.includes('last month') ? 'last_month' : 'this_month' } };
  }
  if (text.includes('overspend') || text.includes('spend most')) {
    return { action: 'overspend_by_category', args: { period: text.includes('last month') ? 'last_month' : 'this_month' } };
  }
  if (text.includes('increase') && text.includes('last month')) {
    return { action: 'compare_category_increase', args: {} };
  }
  if (text.includes('forecast') || text.includes('projected') || text.includes('end of month')) {
    return { action: 'monthly_forecast', args: {} };
  }
  if (text.includes('health score') || text.includes('financial health')) {
    return { action: 'financial_health_score', args: {} };
  }
  if (text.includes('insight') || text.includes('behavior')) {
    return { action: 'behavior_insights', args: {} };
  }
  if (text.includes('summary') || text.includes('summarize') || text.includes('habit')) {
    return { action: 'summarize_habits', args: {} };
  }
  if (text.includes('budget')) {
    const budgetAmount = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    if (/\bset\b/.test(text) && budgetAmount) {
      return { action: 'set_budget', args: { amount: Number(budgetAmount[1]) } };
    }
    return { action: 'budget_status', args: {} };
  }
  if (text.includes('total') || text.includes('how much')) {
    return {
      action: 'total_spent',
      args: { period: text.includes('last month') ? 'last_month' : text.includes('all') ? 'all' : 'this_month' },
    };
  }
  return null;
}

function quickChatReply(message) {
  const text = (message || '').trim().toLowerCase();
  if (!text) return null;
  if (/^\s*(hi|hello|hey)\b/.test(text)) return 'Hey! I can help with expenses, budgets, trends, and forecasts.';
  if (/good morning|good afternoon|good evening/.test(text)) return 'Hello! Ask me things like "what is my highest expense this month?" or "forecast this month spend".';
  if (/how are you/.test(text)) return "I'm doing well. Ready to help with your finances.";
  return null;
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(id);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(id);
        reject(error);
      });
  });
}

function fallbackReply(action, result) {
  if (action === 'add_expense') return result.success ? result.message : `Sorry, ${result.error || 'failed to add expense.'}`;
  if (action === 'delete_all_expenses') return `Deleted ${result.count || 0} expense${result.count === 1 ? '' : 's'}.`;
  if (action === 'get_highest_expense' || action === 'highest_expense') {
    if (!result.expense) return 'No expenses found for that period.';
    return `Highest expense ${result.period.replace('_', ' ')} is ${result.expense.name || result.expense.category} at $${Number(result.expense.amount || 0).toFixed(2)}.`;
  }
  if (action === 'overspend_by_category') {
    if (result.total === 0) return 'No expenses found for that period.';
    return `You spent the most on ${result.category} (${result.period.replace('_', ' ')}): $${Number(result.total).toFixed(2)}.`;
  }
  if (action === 'total_spent') return `Total spent (${result.period.replace('_', ' ')}): $${Number(result.total || 0).toFixed(2)}.`;
  if (action === 'compare_category_increase') {
    if (!result.increases?.length) return 'No category increases compared to last month.';
    const top = result.increases[0];
    return `${top.category} increased the most vs last month (+$${Number(top.delta || 0).toFixed(2)}).`;
  }
  if (action === 'summarize_habits') {
    return result?.thisMonthTotal > 0
      ? `This month total is $${Number(result.thisMonthTotal).toFixed(2)} with ${result.trends?.[0]?.category || 'no clear top category'} as the largest category.`
      : 'Not enough expense data to summarize habits yet.';
  }
  if (action === 'budget_status') {
    if (result.budget == null) return `No budget set. This month total is $${Number(result.total || 0).toFixed(2)}.`;
    return result.over
      ? `You are over budget by $${Math.abs(Number(result.budget) - Number(result.total)).toFixed(2)}.`
      : `You are within budget. Remaining: $${(Number(result.budget) - Number(result.total)).toFixed(2)}.`;
  }
  if (action === 'set_budget') return result.success ? `Budget set to $${Number(result.budget).toFixed(2)}.` : `Sorry, ${result.error || 'failed to set budget.'}`;
  if (action === 'monthly_forecast') {
    return `Current month spend is $${Number(result.currentTotal).toFixed(2)}. At your current daily pace ($${Number(result.dailyVelocity).toFixed(2)}/day), projected month-end total is $${Number(result.projectedTotal).toFixed(2)}.`;
  }
  if (action === 'behavior_insights') {
    const rise = result.risingCategories?.[0];
    const riseText = rise ? `${rise.category} is rising (+$${Number(rise.delta).toFixed(2)} vs last month).` : 'No major category rises detected.';
    const weekendText = result.weekendSpike ? 'Weekend spending is noticeably higher than weekdays.' : 'Weekend spending is similar to weekdays.';
    return `${weekendText} ${riseText} Small purchases: ${result.smallPurchaseCount} (${Math.round((result.smallPurchaseRatio || 0) * 100)}%).`;
  }
  if (action === 'financial_health_score') {
    return `Your financial health score is ${result.score}/100. Top-category concentration is ${Math.round((result.factors?.topCategoryShare || 0) * 100)}%, and month-over-month growth is ${Math.round((result.factors?.monthOverMonthGrowth || 0) * 100)}%.`;
  }
  return 'I can help with expenses, comparisons, forecasts, behavior insights, and budget health.';
}

export async function runAgentWorkflow({ userMessage, user }) {
  const startMs = Date.now();
  let fallbackUsed = false;
  let action = 'help';

  try {
    const safeLog = async (act, latency, usedFallback) => {
      try {
        await logAgentEvent(user.uid, act, latency, usedFallback);
      } catch (_) {
        // Observability must not break user-facing agent behavior.
      }
    };

    const quickReply = quickChatReply(userMessage);
    if (quickReply) {
      await safeLog('quick_chat', Date.now() - startMs, false);
      return { action: 'quick_chat', result: { success: true }, reply: quickReply };
    }

    let decision = detectLocalRoute(userMessage);
    if (!decision) {
      let datasetSummary = {
        counts: { allTime: 0, thisMonth: 0, lastMonth: 0 },
        totals: { allTime: 0, thisMonth: 0, lastMonth: 0 },
        byCategory: { thisMonth: {}, lastMonth: {} },
        recentExpenses: [],
      };
      try {
        datasetSummary = await withTimeout(getExpenseDatasetSummary(user.uid), 6000, 'Expense data fetch');
      } catch (_) {}

      try {
        decision = await withTimeout(
          decideAgentAction({
            message: userMessage,
            datasetSummary,
          }),
          8000,
          'Agent reasoning'
        );
      } catch (_) {
        fallbackUsed = true;
        decision = detectLocalRoute(userMessage) || { action: 'help', args: {} };
      }
    }

    action = decision?.action || 'help';
    const args = decision?.args || {};
    let result;

    switch (action) {
      case 'add_expense':
        result = await withTimeout(
          addExpenseFromMessage(
            {
              amount: args.amount,
              categoryPhrase: args.categoryPhrase || '',
              datePhrase: args.datePhrase || 'today',
            },
            user
          ),
          12000,
          'Add expense'
        );
        break;
      case 'get_highest_expense':
      case 'highest_expense':
        result = await withTimeout(getHighestExpense(user.uid, safePeriod(args.period, 'this_month')), 12000, 'Highest expense');
        break;
      case 'overspend_by_category': {
        const period = args.period === 'last_month' ? 'last_month' : 'this_month';
        const overspend = await withTimeout(getOverspendForPeriod(user.uid, period), 12000, 'Overspend analysis');
        result = { ...overspend, period };
        break;
      }
      case 'total_spent':
        result = await withTimeout(getTotalForPeriod(user.uid, safePeriod(args.period, 'this_month')), 12000, 'Total spending');
        break;
      case 'compare_category_increase':
        result = await withTimeout(getCategoryIncreaseComparedToLastMonth(user.uid), 12000, 'Category comparison');
        break;
      case 'summarize_habits':
        result = await withTimeout(getPredictionsData(user.uid), 12000, 'Spending summary');
        break;
      case 'budget_status':
        result = await withTimeout(getBudgetStatus(user.uid), 12000, 'Budget status');
        break;
      case 'set_budget':
        result = await withTimeout(setBudgetForUser(user.uid, args.amount), 12000, 'Set budget');
        break;
      case 'monthly_forecast':
        result = await withTimeout(getMonthlyForecast(user.uid), 12000, 'Monthly forecast');
        break;
      case 'behavior_insights':
        result = await withTimeout(getBehaviorInsights(user.uid), 12000, 'Behavior insights');
        break;
      case 'financial_health_score':
        result = await withTimeout(getFinancialHealthScore(user.uid), 12000, 'Health score');
        break;
      case 'delete_all_expenses': {
        const shouldDelete = args.confirm === true && isDeleteAllRequest(userMessage);
        if (!shouldDelete) {
          result = { success: false, error: 'I can delete all expenses only if you explicitly ask to delete/remove/clear all expenses.' };
        } else {
          result = await withTimeout(deleteAllExpenses(user.uid), 12000, 'Delete expenses');
        }
        break;
      }
      case 'clarifying_question':
        await safeLog(action, Date.now() - startMs, fallbackUsed);
        return {
          action,
          reply:
            args.question ||
            'Can you clarify what you want to do? I can add expenses, compare periods, summarize habits, check budget, forecast, and health score.',
        };
      case 'help':
      default:
        result = {
          success: true,
          message:
            'I can add expenses, set/check budget, compute totals, compare categories, forecast monthly spend, generate behavior insights, and compute financial health score.',
        };
        break;
    }

    const reply = fallbackReply(action, result);
    await safeLog(action, Date.now() - startMs, fallbackUsed);
    return { action, result, reply };
  } catch (error) {
    try {
      await logAgentEvent(user.uid, action, Date.now() - startMs, true);
    } catch (_) {}
    throw error;
  }
}
