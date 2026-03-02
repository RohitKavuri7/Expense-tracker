/**
 * Single source for adding expenses. Reused by ExpenseForm and Agent.
 * Uses the exact same Firestore collection and document structure.
 */
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { updateMonthlyStatsForExpenseWrite } from './monthlyStatsService';

const EXPENSES_COLLECTION = 'expenses';

/**
 * @param {Object} data - Same shape as ExpenseForm submit
 * @param {string} data.name
 * @param {number} data.amount
 * @param {string} data.category - One of: Food, Transport, Utilities, Entertainment, Other
 * @param {string} data.date - YYYY-MM-DD
 * @param {string} data.uid
 * @param {string[]} [data.sharedWith]
 * @param {string} [data.receiptURL]
 * @returns {Promise<string>} Document ID
 */
export async function addExpense(data) {
  const parsedAmount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount);
  const dateEpoch = data.date ? new Date(`${data.date}T00:00:00`).getTime() : Date.now();
  const payload = {
    name: data.name,
    amount: parsedAmount,
    category: data.category,
    date: data.date,
    dateEpoch,
    uid: data.uid,
    sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
    receiptURL: data.receiptURL || '',
  };
  const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), payload);
  try {
    await updateMonthlyStatsForExpenseWrite(data.uid, data.date);
  } catch (_) {
    // Stats are derived/optional; do not block core expense creation.
  }
  return docRef.id;
}
