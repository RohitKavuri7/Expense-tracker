/**
 * App's fixed categories. Agent must map natural language to these only.
 * Do not create new categories automatically.
 */
export const APP_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];

/**
 * Map natural-language words/phrases to exactly one of APP_CATEGORIES.
 * Keys are lowercased; match against normalized user input.
 */
const NL_TO_CATEGORY = {
  // Food
  food: 'Food',
  groceries: 'Food',
  grocery: 'Food',
  eating: 'Food',
  restaurant: 'Food',
  restaurants: 'Food',
  cafe: 'Food',
  coffee: 'Food',
  pizza: 'Food',
  burger: 'Food',
  snacks: 'Food',
  lunch: 'Food',
  dinner: 'Food',
  breakfast: 'Food',
  supermarket: 'Food',
  // Transport
  transport: 'Transport',
  transportation: 'Transport',
  uber: 'Transport',
  taxi: 'Transport',
  gas: 'Transport',
  fuel: 'Transport',
  car: 'Transport',
  parking: 'Transport',
  bus: 'Transport',
  train: 'Transport',
  metro: 'Transport',
  lyft: 'Transport',
  // Utilities
  utilities: 'Utilities',
  utility: 'Utilities',
  rent: 'Utilities',
  electricity: 'Utilities',
  water: 'Utilities',
  internet: 'Utilities',
  phone: 'Utilities',
  mobile: 'Utilities',
  bill: 'Utilities',
  bills: 'Utilities',
  // Entertainment
  entertainment: 'Entertainment',
  movies: 'Entertainment',
  movie: 'Entertainment',
  gaming: 'Entertainment',
  games: 'Entertainment',
  subscription: 'Entertainment',
  subscriptions: 'Entertainment',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  hobby: 'Entertainment',
  hobbies: 'Entertainment',
};

/**
 * @param {string} categoryPhrase - e.g. "groceries", "uber"
 * @returns {string} One of APP_CATEGORIES, or "Other" if no match
 */
export function mapToAppCategory(categoryPhrase) {
  if (!categoryPhrase || typeof categoryPhrase !== 'string') return 'Other';
  const normalized = categoryPhrase.trim().toLowerCase();
  if (NL_TO_CATEGORY[normalized]) return NL_TO_CATEGORY[normalized];

  // Support phrases like "pizza hut", "uber ride", "internet bill"
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    if (NL_TO_CATEGORY[token]) return NL_TO_CATEGORY[token];
  }

  return 'Other';
}
