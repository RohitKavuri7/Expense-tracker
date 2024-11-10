import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import { auth } from './firebaseConfig'; // Import your Firebase Auth configuration

const root = ReactDOM.createRoot(document.getElementById('root'));

const MainApp = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return <App user={user} />; // Pass the user state to App
};

root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);

// Performance measurement setup
reportWebVitals();
