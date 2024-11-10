import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import './BudgetSettings.css'; // Optional for styling

const BudgetSettings = ({ user }) => {
  const [budgets, setBudgets] = useState({
    Food: 0,
    Transport: 0,
    Utilities: 0,
    Entertainment: 0,
    Other: 0,
  });
  
  useEffect(() => {
    // Fetch existing budgets from Firestore when the component mounts
    const fetchBudgets = async () => {
      const budgetRef = doc(collection(db, 'budgets'), user.uid);
      const budgetSnap = await getDoc(budgetRef);
      
      if (budgetSnap.exists()) {
        setBudgets(budgetSnap.data());
      }
    };

    fetchBudgets();
  }, [user.uid]);

  const handleBudgetChange = (category, value) => {
    setBudgets({
      ...budgets,
      [category]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'budgets', user.uid), budgets);
      alert('Budgets updated successfully!');
    } catch (error) {
      alert('Error updating budgets: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Set Your Budget</h2>
      {Object.keys(budgets).map((category) => (
        <div key={category}>
          <label>{category} Budget:</label>
          <input
            type="number"
            value={budgets[category]}
            onChange={(e) => handleBudgetChange(category, e.target.value)}
          />
        </div>
      ))}
      <button type="submit">Save Budgets</button>
    </form>
  );
};

export default BudgetSettings;
