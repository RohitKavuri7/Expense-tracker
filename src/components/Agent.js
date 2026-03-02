import React, { useState, useRef, useEffect } from 'react';
import { runAgentWorkflow } from '../services/agentOrchestrator';
import { deleteAllExpenses } from '../services/agentService';
import './Agent.css';

const Agent = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);
  const messageIdRef = useRef(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!user?.uid) {
      setStorageHydrated(false);
      return;
    }
    try {
      const rawChat = localStorage.getItem(`agent_chat_${user.uid}`);
      if (rawChat) {
        const parsed = JSON.parse(rawChat);
        if (Array.isArray(parsed)) setMessages(parsed);
        const maxId = parsed.reduce((max, m) => (m.id > max ? m.id : max), 0);
        messageIdRef.current = maxId + 1;
      } else {
        setMessages([]);
      }
    } catch (_) {
      setMessages([]);
    }
    try {
      const raw = localStorage.getItem(`agent_activity_${user.uid}`);
      if (raw) setActivityLog(JSON.parse(raw));
      else setActivityLog([]);
    } catch (_) {
      setActivityLog([]);
    }
    setStorageHydrated(true);
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid || !storageHydrated) return;
    localStorage.setItem(`agent_chat_${user.uid}`, JSON.stringify(messages.slice(-100)));
  }, [messages, user?.uid, storageHydrated]);
  useEffect(() => {
    if (!user?.uid || !storageHydrated) return;
    localStorage.setItem(`agent_activity_${user.uid}`, JSON.stringify(activityLog.slice(0, 20)));
  }, [activityLog, user?.uid, storageHydrated]);

  const append = (role, content) => {
    const id = messageIdRef.current++;
    setMessages((prev) => [...prev, { id, role, content }]);
    return id;
  };

  const updateMessage = (id, patch) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        return { ...m, ...patch };
      })
    );
  };
  const addActivity = (action, status, details) => {
    setActivityLog((prev) => [
      {
        id: Date.now(),
        time: new Date().toLocaleString(),
        action,
        status,
        details,
      },
      ...prev,
    ]);
  };
  const isDeleteAllIntent = (text) => /\b(delete|remove|clear)\b/.test(text) && /\ball\b/.test(text) && /\bexpenses?\b/.test(text);
  const isConfirmYes = (text) => /^(yes|y|confirm|proceed|do it)$/i.test(text.trim());
  const isConfirmNo = (text) => /^(no|n|cancel|stop)$/i.test(text.trim());
  const clearChat = () => {
    setMessages([]);
    setPendingDeleteConfirm(false);
    if (user?.uid) localStorage.removeItem(`agent_chat_${user.uid}`);
  };

  const withTimeout = (promise, timeoutMs, label) =>
    new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), timeoutMs);
      promise
        .then((value) => {
          clearTimeout(id);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(id);
          reject(error);
        });
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    append('user', text);

    if (pendingDeleteConfirm) {
      if (isConfirmYes(text)) {
        setPendingDeleteConfirm(false);
        const pendingId = messageIdRef.current++;
        setMessages((prev) => [...prev, { id: pendingId, role: 'agent', content: 'Deleting all expenses...', pending: true }]);
        try {
          const outcome = await withTimeout(deleteAllExpenses(user.uid), 12000, 'Delete expenses');
          const reply = `Deleted ${outcome.count || 0} expense${outcome.count === 1 ? '' : 's'}.`;
          if (mountedRef.current) updateMessage(pendingId, { content: reply, pending: false });
          addActivity('delete_all_expenses', 'success', reply);
        } catch (err) {
          const msg = `Error: ${err.message || 'Failed to delete expenses.'}`;
          if (mountedRef.current) updateMessage(pendingId, { content: msg, pending: false });
          addActivity('delete_all_expenses', 'error', msg);
        }
        return;
      }
      if (isConfirmNo(text)) {
        setPendingDeleteConfirm(false);
        append('agent', 'Delete request cancelled.');
        addActivity('delete_all_expenses', 'cancelled', 'User cancelled delete confirmation');
        return;
      }
      append('agent', 'Please reply with "yes" to confirm deletion, or "no" to cancel.');
      return;
    }

    if (isDeleteAllIntent(text.toLowerCase())) {
      setPendingDeleteConfirm(true);
      append('agent', 'This will permanently delete all your expenses. Reply "yes" to confirm or "no" to cancel.');
      addActivity('delete_all_expenses', 'pending_confirmation', 'Awaiting user confirmation');
      return;
    }

    const pendingId = messageIdRef.current++;
    setMessages((prev) => [
      ...prev,
      {
        id: pendingId,
        role: 'agent',
        content: 'Thinking...',
        pending: true,
      },
    ]);

    try {
      const outcome = await withTimeout(
        runAgentWorkflow({ userMessage: text, user }),
        12000,
        'Request'
      );
      if (mountedRef.current) updateMessage(pendingId, { content: outcome.reply, pending: false });
      addActivity(outcome.action || 'unknown', 'success', outcome.reply);
    } catch (err) {
      if (mountedRef.current) {
        updateMessage(pendingId, {
          content: `Error: ${err.message || 'Something went wrong.'}`,
          pending: false,
        });
      }
      addActivity('request', 'error', err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="agent-page">
      <h2>Expense Agent</h2>
      <p className="agent-hint">Ask anything about your spending: highest expense, overspending, summaries, trends, budget checks, and more.</p>
      <div className="agent-toolbar">
        <button type="button" className="agent-clear-btn" onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="agent-messages">
        {messages.length === 0 && (
          <div className="agent-placeholder">
            Try: &quot;What is my highest expense this month?&quot;, &quot;I spent $100 on groceries&quot;, or &quot;Which category increased compared to last month?&quot;
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`agent-msg agent-msg--${m.role}`}>
            <span className="agent-msg-label">{m.role === 'user' ? 'You' : 'Agent'}</span>
            <div className={`agent-msg-content${m.pending ? ' agent-msg--loading' : ''}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="agent-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="agent-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="agent-send">
          Send
        </button>
      </form>

      <div className="agent-activity">
        <h3>Recent Activity</h3>
        {activityLog.length === 0 ? (
          <p className="agent-activity-empty">No activity yet.</p>
        ) : (
          <ul>
            {activityLog.slice(0, 6).map((item) => (
              <li key={item.id}>
                <span className={`activity-status activity-status--${item.status}`}>{item.status}</span>
                <strong>{item.action}</strong> - {item.details}
                <div className="activity-time">{item.time}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Agent;
