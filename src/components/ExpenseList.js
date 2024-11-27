import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import './ExpenseList.css';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


const ExpenseList = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [updatedExpense, setUpdatedExpense] = useState({
    name: '',
    amount: '',
    category: '',
    date: '',
    receiptURL: '',
    receiptFile: null, // For the uploaded file
  });
  const [loading, setLoading] = useState(true);

  const categoryOptions = ["Food", "Transport", "Entertainment", "Other", "Utilities"];

  useEffect(() => {
    const fetchBudget = async () => {
      const docRef = doc(db, 'budgets', user.uid);
      const budgetSnap = await getDoc(docRef);
      if (budgetSnap.exists()) setBudget(budgetSnap.data().budget);
    };
    fetchBudget();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData = [];
      let sum = 0;
      querySnapshot.forEach((doc) => {
        const expense = { id: doc.id, ...doc.data() };
        expensesData.push(expense);
        sum += expense.amount;
      });
      setExpenses(expensesData);
      setTotal(sum);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    let filtered = expenses;
    if (searchTerm) filtered = filtered.filter((expense) => expense.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter) filtered = filtered.filter((expense) => expense.category === categoryFilter);
    if (sortBy) {
      filtered.sort((a, b) => {
        if (sortBy === 'date') return sortOrder === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
        else if (sortBy === 'amount') return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        return 0;
      });
    }
    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, categoryFilter, sortBy, sortOrder]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      alert('Expense deleted successfully!');
    } catch (error) {
      alert('Error deleting expense: ' + error.message);
    }
  };

  const uploadReceipt = async (file) => {
    const storage = getStorage();
    const storageRef = ref(storage, `receipts/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense.id);
    setUpdatedExpense({
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      receiptURL: expense.receiptURL || '',
      receiptFile: null, // Reset file input on edit
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const expenseRef = doc(db, 'expenses', editingExpense);

    // Handle file upload (if any)
    if (updatedExpense.receiptFile) {
      const uploadedReceiptURL = await uploadReceipt(updatedExpense.receiptFile); // Implement this function
      updatedExpense.receiptURL = uploadedReceiptURL;
    }

    try {
      await updateDoc(expenseRef, {
        name: updatedExpense.name,
        amount: parseFloat(updatedExpense.amount),
        category: updatedExpense.category,
        date: updatedExpense.date,
        receiptURL: updatedExpense.receiptURL,
      });
      alert('Expense updated successfully!');
      setEditingExpense(null);
    } catch (error) {
      alert('Error updating expense: ' + error.message);
    }
  };

  const handleCancelEdit = () => setEditingExpense(null);

  // File upload handler
  const handleFileChange = (e) => {
    setUpdatedExpense({ ...updatedExpense, receiptFile: e.target.files[0] });
  };

  return (
    <div className="expense-list">
      <h2>My Expenses</h2>
      
      
      {loading ? <p>Loading expenses...</p> : (
        <>
          {budget !== null && (
            <div className={`budget-summary ${total > budget ? 'over-budget' : ''}`}>
              <h3>Budget: ${budget.toFixed(2)}</h3>
              <h3>Total Expenses: ${total.toFixed(2)}</h3>
              <h3>Remaining Budget: ${(budget - total).toFixed(2)}</h3>
              {total > budget && <p className="budget-alert">You have exceeded your budget!</p>}
            </div>
          )}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="category-filter"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="sort-controls">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                <option value="">Sort By</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="order-select">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <ul className="expenses">
            {filteredExpenses.length === 0 ? (
              <li>No expenses found.</li>
            ) : (
              filteredExpenses.map((expense) => (
                <li key={expense.id} className="expense-item">
                  <div className="expense-name">{expense.name}</div>
                  <div className="expense-amount">${expense.amount.toFixed(2)}</div>
                  <div className="expense-category">{expense.category}</div>
                  <div className="expense-date">{new Date(expense.date).toLocaleDateString()}</div>
                  {expense.receiptURL && (
                    <div className="expense-receipt">
                      <a href={expense.receiptURL} target="_blank" rel="noopener noreferrer">View Receipt</a>
                    </div>
                  )}
                  <div className="expense-actions">
                    <button onClick={() => handleEdit(expense)}>Edit</button>
                    <button onClick={() => handleDelete(expense.id)}>Delete</button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {editingExpense && (
            <form onSubmit={handleUpdate} className="edit-expense-form">
              <h3>Edit Expense</h3>
              <input
                type="text"
                value={updatedExpense.name}
                onChange={(e) => setUpdatedExpense({ ...updatedExpense, name: e.target.value })}
                placeholder="Expense Name"
                required
              />
              <input
                type="number"
                value={updatedExpense.amount}
                onChange={(e) => setUpdatedExpense({ ...updatedExpense, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={updatedExpense.category}
                onChange={(e) => setUpdatedExpense({ ...updatedExpense, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                type="date"
                value={updatedExpense.date}
                onChange={(e) => setUpdatedExpense({ ...updatedExpense, date: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
                required
              />
              <input
                type="text"
                value={updatedExpense.receiptURL}
                onChange={(e) => setUpdatedExpense({ ...updatedExpense, receiptURL: e.target.value })}
                placeholder="Receipt URL"
              />
              <input
                type="file"
                onChange={handleFileChange}
              />
              <button type="submit">Update</button>
              <button type="button" onClick={handleCancelEdit}>Cancel</button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default ExpenseList;
