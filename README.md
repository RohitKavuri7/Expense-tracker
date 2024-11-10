Project Overview:

The Expense Tracker is a web-based application that helps users manage their personal finances by tracking expenses, setting budgets, and categorizing spending. Users can register, log in, and securely store their financial data using Firebase. The application also supports receipt uploads with OCR to automatically extract expense details.

Features:
User Authentication: Secure user registration and login with Firebase Authentication.
Expense Management: Users can add, edit, delete, and view expenses.
Categories: Both predefined and custom categories for expenses.
Budget Tracking: Allows users to set monthly budgets and view expenses against budget limits.
Receipt OCR: Upload receipts to auto-extract data using OCR (Tesseract.js).
Expense Reporting: Generates reports and visualizations for expenses.
Cloud Backup: Data stored and synced across devices using Firebase Firestore.

Technologies Used
Frontend: React, CSS
Backend: Firebase (Firestore for database, Storage for receipts, Authentication for user management)
OCR: Tesseract.js
Version Control: Git
Testing: Selenium for automated testing

Installation and Setup
Prerequisites
Node.js (v14 or higher)
Firebase project with Firestore and Authentication enabled
Internet connection for Firebase functionality
Setup Instructions
Clone the repository:

bash
Copy code
git clone https://github.com/RohitKavuri7/expense-tracker.git
cd expense-tracker
Install dependencies:

bash
Copy code
npm install
Configure Firebase:

Create a Firebase project on Firebase Console.
Enable Firestore, Storage, and Authentication.
Copy Firebase configuration details and add them to a firebaseConfig.js file in src.
Run the application:

bash
Copy code
npm start
Access the app:

Open http://localhost:3000 in a web browser.

Usage
Register and Login: Start by creating a new account or logging in if you already have one.
Add Expense: Use the "Add Expense" option to enter details like name, amount, date, and category.
Upload Receipt: Optionally, upload a receipt image to auto-fill details using OCR.
Edit/Delete Expense: Modify or remove any expense by selecting the edit or delete option.
Budget Management: Set monthly budgets to monitor expenses.
View Reports: Visualize spending trends and analyze expense breakdown by category.

Testing
Manual Testing: The app was manually tested for functionality, user interface, and performance.
Automated Testing: Automated test cases are implemented using Selenium for major workflows.

Deployment
The application can be deployed on any platform that supports React apps and Firebase, such as:
Firebase Hosting
Netlify
Vercel

Acknowledgments
Firebase for backend and database services.
Tesseract.js for OCR processing.
React for frontend development.
