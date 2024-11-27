import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import ExpenseReport from './components/ExpenseReport';
import BudgetForm from './components/BudgetForm';
import ForgotPassword from './components/ForgotPassword';
import Sidebar from './components/Sidebar';
import { auth } from './firebaseConfig';
import Profile from './components/Profile';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        {user ? (
          <>
            <header className="header">
              <h1>Expense Tracker</h1>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>
            <div className="content">
              <Sidebar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<ExpenseList user={user} />} />
                  <Route path="/add-expense" element={<ExpenseForm user={user} />} />
                  <Route path="/report" element={<ExpenseReport user={user} />} />
                  <Route path="/set-budget" element={<BudgetForm user={user} />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </main>
            </div>
          </>
        ) : (
          <div className="auth-container">
            <HomePage setUser={setUser} />
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;
