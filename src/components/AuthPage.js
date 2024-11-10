import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import './AuthPage.css'; // Ensure this file has styles

function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State to store error messages
  const navigate = useNavigate();

  // Gmail Email Validation
  const validateEmail = (email) => {
    // Updated regex to ensure it checks for valid Gmail addresses only
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    const isValid = gmailRegex.test(email);
    console.log('Email Validation Result:', isValid); // Log validation result
    return isValid;
  };

  // Clear error message
  const clearError = () => {
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors

    // Log the email and validation result
    console.log('Entered Email:', email);

    // Validate email before proceeding
    if (!validateEmail(email)) {
      setError('Email must be a valid Gmail address ending with @gmail.com.');
      console.log('Invalid Email:', email); // Log when email is invalid
      return; // Stop execution if email is invalid
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('User registered successfully!');
      navigate('/home');
    } catch (error) {
      setError(error.message); // Handle Firebase errors
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors

    // Log the email and validation result
    console.log('Entered Email:', email);

    // Validate email before proceeding
    if (!validateEmail(email)) {
      setError('Email must be a valid Gmail address ending with @gmail.com.');
      console.log('Invalid Email:', email); // Log when email is invalid
      return; // Stop execution if email is invalid
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('Logged in successfully!');
      navigate('/home');
    } catch (error) {
      setError(error.message); // Handle Firebase errors
    }
  };

  return (
    <div className="auth-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      <form onSubmit={isRegistering ? handleRegister : handleLogin} className="auth-form">
        {isRegistering && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="form-control"
            required
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="form-control"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="form-control"
          required
        />
        {/* Display error messages */}
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>
      <p>
        {isRegistering
          ? 'Already have an account? '
          : 'New here? '}
        <button className="btn btn-link" onClick={() => {
          setIsRegistering(!isRegistering);
          clearError(); // Clear any error messages when switching modes
        }}>
          {isRegistering ? 'Login' : 'Register'}
        </button>
      </p>
    </div>
  );
}

export default AuthPage;
