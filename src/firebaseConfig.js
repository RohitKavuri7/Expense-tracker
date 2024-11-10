// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // Import Firebase Storage

const firebaseConfig = {
    apiKey: "AIzaSyAaxft_ZfY0vsOI7M11mmupcuTtmis3nxE",
    authDomain: "expense-tracker-8c287.firebaseapp.com",
    projectId: "expense-tracker-8c287",
    storageBucket: "expense-tracker-8c287.appspot.com",
    messagingSenderId: "120054907546",
    appId: "1:120054907546:web:e6cb1891aa88be61179523",
    measurementId: "G-VZJTLY3GXG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize Firebase Storage

export { db, auth, storage }; // Export storage along with db and auth
