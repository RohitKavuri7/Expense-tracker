import { db } from '../firebaseConfig';
import { collection, doc, getDocs, query, setDoc, where, serverTimestamp } from 'firebase/firestore';

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthRangeFromYearMonth(yearMonth) {
  const [y, m] = yearMonth.split('_').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export function getYearMonth(dateString) {
  if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const now = new Date();
    return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${dateString.slice(0, 4)}_${dateString.slice(5, 7)}`;
}

export async function recomputeMonthlyStats(uid, yearMonth) {
  const range = getMonthRangeFromYearMonth(yearMonth);
  const q = query(
    collection(db, 'expenses'),
    where('uid', '==', uid),
    where('date', '>=', range.start),
    where('date', '<=', range.end)
  );
  const snapshot = await getDocs(q);

  let total = 0;
  let expenseCount = 0;
  let largestExpense = null;
  const categoryBreakdown = {};

  snapshot.forEach((expenseDoc) => {
    const data = expenseDoc.data();
    const amount = Number(data.amount || 0);
    total += amount;
    expenseCount += 1;
    const category = data.category || 'Other';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
    if (!largestExpense || amount > Number(largestExpense.amount || 0)) {
      largestExpense = {
        id: expenseDoc.id,
        name: data.name || '',
        amount,
        category,
        date: data.date || '',
      };
    }
  });

  const docId = `${uid}_${yearMonth}`;
  await setDoc(doc(db, 'userMonthlyStats', docId), {
    uid,
    yearMonth,
    total,
    expenseCount,
    categoryBreakdown,
    largestExpense,
    updatedAt: serverTimestamp(),
  });
}

export async function updateMonthlyStatsForExpenseWrite(uid, newDate, oldDate = null) {
  const yearMonths = new Set([getYearMonth(newDate)]);
  if (oldDate) yearMonths.add(getYearMonth(oldDate));
  for (const ym of yearMonths) {
    await recomputeMonthlyStats(uid, ym);
  }
}
