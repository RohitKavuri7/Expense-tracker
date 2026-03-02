import React, { useState } from 'react';
import { db } from '../firebaseConfig'; // Import Firestore config
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation

const ProfileManagement = ({ user }) => {
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();  // Initialize the navigate hook

  // Function to add a profile
  const addProfile = async (userId, profile) => {
    try {
      // Add the profile to the "profiles" subcollection for the current user
      const docRef = await addDoc(collection(db, `users/${userId}/profiles`), profile);
      setMessage('Profile added successfully!');
      setProfileName('');
      setProfileEmail('');
      console.log('Document written with ID: ', docRef.id); // Optional: log the document ID
    } catch (error) {
      setMessage('Error adding profile: ' + error.message);
    }
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    if (profileName && profileEmail) {
      const profile = { name: profileName, email: profileEmail };
      addProfile(user.uid, profile);  // Use the user ID from the current authenticated user
    } else {
      setMessage('Please fill out all fields.');
    }
  };

  return (
    <div>
      <h2>Manage Profiles</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Profile Name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Profile Email"
          value={profileEmail}
          onChange={(e) => setProfileEmail(e.target.value)}
          required
        />
        <button type="submit">Add Profile</button>
      </form>
      {message && <p>{message}</p>} {/* Display the message */}
    </div>
  );
};

export default ProfileManagement;
