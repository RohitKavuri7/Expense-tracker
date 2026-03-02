import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';  // Import useNavigate
import './BudgetForm.css';

const BudgetForm = ({ user }) => {
  const [budget, setBudget] = useState('');
  const [currentBudget, setCurrentBudget] = useState(null);
  const navigate = useNavigate();  // Initialize navigate

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const budgetRef = doc(db, 'budgets', user.uid);
        const budgetSnap = await getDoc(budgetRef);
        if (budgetSnap.exists()) {
          const currentBudget = budgetSnap.data().budget;
          setCurrentBudget(currentBudget != null ? currentBudget : null);
          setBudget(currentBudget != null ? String(currentBudget) : '');
        }
      } catch (error) {
        // Keep form usable even if initial fetch fails.
      }
    };
    fetchBudget();
  }, [user.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!budget) {
      alert('Please enter a budget amount.');
      return;
    }

    try {
      // Save budget to Firestore
      const parsedBudget = parseFloat(budget);
      await setDoc(doc(db, 'budgets', user.uid), { budget: parsedBudget });
      alert('Budget set successfully!');
      setCurrentBudget(parsedBudget);
      setBudget(String(parsedBudget)); // Keep latest value visible

      // Navigate back to the Expense List page after setting the budget
      navigate('/');  // Redirect to the Expense List page

    } catch (error) {
      alert('Error setting budget: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="budget-form">
      <h2>Set Your Budget</h2>
      {currentBudget != null && (
        <p className="budget-current">Current budget: ${currentBudget.toFixed(2)}</p>
      )}
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
