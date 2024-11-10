import React, { useState } from 'react';
import { auth } from '../firebaseConfig'; // Import your Firebase configuration

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await auth.sendPasswordResetEmail(email);
      setMessage('Check your email for a password reset link!');
      setError('');
    } catch (err) {
      setError('Error sending reset email: ' + err.message);
      setMessage('');
    }
  };

  return (
    <div className="forgot-password">
      <h2>Forgot Password</h2>
      <form onSubmit={handlePasswordReset}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p>{error}</p>}
    </div>
  );
};

export default ForgotPassword;
