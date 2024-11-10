import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';  // Import useNavigate
import './BudgetForm.css';

const BudgetForm = ({ user }) => {
  const [budget, setBudget] = useState('');
  const navigate = useNavigate();  // Initialize navigate

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!budget) {
      alert('Please enter a budget amount.');
      return;
    }

    try {
      // Save budget to Firestore
      await setDoc(doc(db, 'budgets', user.uid), { budget: parseFloat(budget) });
      alert('Budget set successfully!');
      setBudget(''); // Clear the input field

      // Navigate back to the Expense List page after setting the budget
      navigate('/');  // Redirect to the Expense List page

    } catch (error) {
      alert('Error setting budget: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      <h2>Set Your Budget</h2>
      <input
        type="number"
        name="budget"
        placeholder="Enter Budget Amount"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
      <button type="submit">Set Budget</button>
    </form>
  );
};

export default BudgetForm;
