import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import './ExpenseForm.css';

const ExpenseForm = ({ user, expenseId }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [date, setDate] = useState('');
  const [existingReceiptURL, setExistingReceiptURL] = useState('');

  const predefinedCategories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpenseData = async () => {
      if (expenseId) {
        const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
        if (expenseDoc.exists()) {
          const expenseData = expenseDoc.data();
          setName(expenseData.name);
          setAmount(expenseData.amount);
          setCategory(expenseData.category);
          setDate(expenseData.date.split('T')[0]);
          setExistingReceiptURL(expenseData.receiptURL || '');
        }
      }
    };
    fetchExpenseData();
  }, [expenseId]);

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    setReceipt(file);
    if (file) {
      processReceipt(file);
    } else {
      setOcrText('');
    }
  };

  const processReceipt = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      Tesseract.recognize(event.target.result, 'eng')
        .then(({ data: { text } }) => {
          setOcrText(text);
          extractExpenseData(text);
        })
        .catch(error => console.error('OCR processing failed:', error));
    };
    reader.readAsDataURL(file);
  };

  const extractExpenseData = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const amountRegex = /\$?\d+(?:,\d{3})*(?:\.\d{2})?/;

    if (lines.length > 0) {
      setName(lines[0]);
      const match = lines[0].match(amountRegex);
      if (match) setAmount(match[0].replace('$', ''));
    }
    if (lines.length > 1) {
      setCategory(predefinedCategories.includes(lines[1]) ? lines[1] : 'Other');
    }
  };

  const handleAmountChange = (e) => {
    const inputAmount = e.target.value;
    if (inputAmount >= 0 || inputAmount === '') {
      setAmount(inputAmount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !amount || !category || !date) {
      alert('Please fill out all required fields.');
      return;
    }

    const today = new Date();
    const selectedDate = new Date(date);
    if (selectedDate > today) {
      alert('Please select a date that is not in the future.');
      return;
    }

    const expenseData = {
      name,
      amount: parseFloat(amount),
      category: category === 'Custom' ? customCategory : category,
      date,
      uid: user.uid,
    };

    try {
      let receiptURL = existingReceiptURL;

      if (receipt) {
        const receiptRef = ref(storage, `receipts/${user.uid}/${receipt.name}`);
        await uploadBytes(receiptRef, receipt);
        receiptURL = await getDownloadURL(receiptRef);
      }

      if (expenseId) {
        await updateDoc(doc(db, 'expenses', expenseId), { ...expenseData, receiptURL });
        alert('Expense updated successfully!');
      } else {
        await addDoc(collection(db, 'expenses'), { ...expenseData, receiptURL });
        alert('Expense added successfully!');
      }

      navigate('/');
    } catch (error) {
      console.error('Error adding/updating expense:', error);
      alert('Failed to add/update expense: ' + error.message);
    }
  };

  return (
    <div className="expense-form">
      <h2>{expenseId ? 'Edit Expense' : 'Add Expense'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Expense Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={handleAmountChange}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          {predefinedCategories.map((cat, index) => (
            <option key={index} value={cat}>{cat}</option>
          ))}
          <option value="Custom">Custom</option>
        </select>
        {category === 'Custom' && (
          <input
            type="text"
            placeholder="Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleReceiptUpload}
        />
        {receipt && <p>Receipt Uploaded: {receipt.name}</p>}
        {ocrText && <p>Extracted Text: {ocrText}</p>}
        <button type="submit">{expenseId ? 'Update Expense' : 'Add Expense'}</button>
      </form>
      {expenseId && existingReceiptURL && !receipt && (
        <div>
          <p>Existing Receipt:</p>
          <a href={existingReceiptURL} target="_blank" rel="noopener noreferrer">View Current Receipt</a>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;
