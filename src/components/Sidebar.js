import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <div className="sidebar">
      <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
        ✕ Close
      </button>
      <ul>
        <li><Link to="/" onClick={onClose}>Home</Link></li>
        <li><Link to="/set-budget" onClick={onClose}>My Budgets</Link></li>
        <li><Link to="/report" onClick={onClose}>Generate Report</Link></li>
        <li><Link to="/add-expense" onClick={onClose}>Add Expense</Link></li>
        <li><Link to="/agent" onClick={onClose}>Agent</Link></li>
        <li><Link to="/profile" onClick={onClose}>Profile</Link></li>
        <li><Link to="/profile-management" onClick={onClose}>Manage Profiles</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
