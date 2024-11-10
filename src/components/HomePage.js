import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import './HomePage.css'; // Add CSS for styling if needed

const HomePage = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (err) {
      setError('Failed to log in: ' + err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (err) {
      setError('Failed to register: ' + err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError('Failed to send reset email: ' + err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success">{successMessage}</p>}
      {isResettingPassword ? (
        <>
          <h3>Reset Password</h3>
          <form onSubmit={handleResetPassword}>
            <input 
              type="email" 
              name="Email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email" 
              required 
            />
            <button type="submit">Send Reset Email</button>
          </form>
          <p onClick={() => setIsResettingPassword(false)} style={{ cursor: 'pointer', fontSize: 'small', color: 'blue' }}>
            Back to Login
          </p>
        </>
      ) : (
        <>
          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            <input 
              type="email" 
              name="Email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email" 
              required 
            />
            <input 
              type="password"
              name="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password" 
              required 
            />
            <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
          </form>
          <p>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </p>
          <p 
            onClick={() => setIsResettingPassword(true)} 
            style={{ cursor: 'pointer', fontSize: 'small', color: 'blue' }}>
            Forgot Password?
          </p>
        </>
      )}
    </div>
  );
};

export default HomePage;
