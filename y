service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document=**} {
      allow read, write: if request.auth != null;  // Allow authenticated users to read and write
    }

    match /budgets/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;  // Ensure users can access only their budget data
    }
  }
}
