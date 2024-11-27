// src/components/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css'; // Optional: Create a CSS file for styling

const Sidebar = () => {
  return (
    <div className="sidebar">
      
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/set-budget">My Budgets</Link>
        </li>
        <li>
          <Link to="/report">Generate Report</Link>
        </li>
        <li>
          <Link to="/add-expense">Add Expense</Link>
        </li>
        {/* Profile Section */}
        <li>
          <Link to="/profile">Profile</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
