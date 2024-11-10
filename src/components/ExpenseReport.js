import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Pie } from 'react-chartjs-2';
import { CSVLink } from 'react-csv';
import './ExpenseReport.css';
import { Chart, registerables } from 'chart.js';

// Register chart components
Chart.register(...registerables);

const ExpenseReport = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [totalSelectedExpenses, setTotalSelectedExpenses] = useState(0);

  // Fetch expenses from Firestore
  useEffect(() => {
    const q = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData = [];
      querySnapshot.forEach((doc) => {
        const expense = { id: doc.id, ...doc.data() };
        expensesData.push(expense);
      });
      setExpenses(expensesData);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Filter expenses by date and category, calculate filtered total
  useEffect(() => {
    let filtered = expenses;

    if (startDate && endDate) {
      filtered = filtered.filter(
        (expense) =>
          new Date(expense.date) >= new Date(startDate) &&
          new Date(expense.date) <= new Date(endDate)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }

    setFilteredExpenses(filtered);

    // Calculate total based on filtered expenses
    const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalSelectedExpenses(total);

    // Calculate category totals for filtered expenses
    const categorySum = filtered.reduce((acc, expense) => {
      const category = expense.category || 'Uncategorized'; // Handle uncategorized expenses
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    setCategoryTotals(categorySum);
  }, [startDate, endDate, expenses, selectedCategory]);

  // Prepare data for pie chart based on filtered expenses
  const chartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      },
    ],
  };

  // Handle case for empty chart data
  if (filteredExpenses.length === 0) {
    return <div>No expenses available for this user.</div>;
  }

  const csvData = filteredExpenses.map((expense) => ({
    name: expense.name,
    amount: expense.amount,
    category: expense.category,
    date: new Date(expense.date).toLocaleDateString(),
  }));

  return (
    <div className="expense-report">
      <h2>Expense Report</h2>

      <div className="filters">
        <label htmlFor="start-date">
          Start Date:
          <input 
            id="start-date" 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </label>
        <label htmlFor="end-date">
          End Date:
          <input 
            id="end-date" 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </label>
        <label>
          Category:
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {Object.keys(categoryTotals).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3>Expenses within selected filters:</h3>
      <ul>
        {filteredExpenses.map((expense) => (
          <li key={expense.id}>
            <strong>{expense.name}</strong>
            <span>${expense.amount.toFixed(2)}</span>
            <span>{expense.category}</span>
            <span>{new Date(expense.date).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>

      <h3>Total of selected expenses: ${totalSelectedExpenses.toFixed(2)}</h3>

      <div className="category-totals">
        <h3>Category-wise total:</h3>
        <ul>
          {Object.keys(categoryTotals).map((category) => (
            <li key={category}>
              <strong>{category}</strong>
              <span>${categoryTotals[category].toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <h3>Pie Chart:</h3>
      <Pie data={chartData} />

      <button className="report-button">
        <CSVLink data={csvData} filename="expense-report.csv">
          Download Report
        </CSVLink>
      </button>
    </div>
  );
};

export default ExpenseReport;
