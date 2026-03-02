import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';  // Import Firebase configuration
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './Profile.css';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch user data on component mount
    const fetchUserData = async () => {
      const user = auth.currentUser; // Get the currently authenticated user

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid); // Get reference to the user's document
          const docSnap = await getDoc(docRef); // Fetch the document
          if (docSnap.exists()) {
            const data = docSnap.data(); // If document exists, get the data
            setUserData(data);
            setName(data.name || '');
            setEmail(data.email || '');
          } else {
            setError('User data not found.');
          }
        } catch (err) {
          setError('Failed to fetch user data.');
        }
      } else {
        setError('No user is signed in.');
      }
    };

    fetchUserData();
  }, []);  // Only run once on mount

  const handleSave = async () => {
    setError('');
    setSuccessMessage('');
    const user = auth.currentUser;

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, {
          name,
          email,
        });
        setSuccessMessage('Profile updated successfully.');
        setUserData({ name, email });
        setIsEditing(false);
      } catch (err) {
        setError('Failed to update profile.');
      }
    }
  };

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div className="profile">
      <h2>Profile</h2>
      {successMessage && <p className="success">{successMessage}</p>}
      {userData ? (
        <div>
          {isEditing ? (
            <div>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button onClick={handleSave}>Save</button>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          ) : (
            <div>
              <p><strong>Name:</strong> {userData.name}</p>
              <p><strong>Email:</strong> {userData.email}</p>
              <button onClick={() => setIsEditing(true)}>Edit</button>
            </div>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Profile;
