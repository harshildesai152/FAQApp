import React, { useEffect, useState } from 'react';

const Home = () => {
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/users/get-my-received-messages", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(data.messages || []);
        if (data.messages.length > 0) {
          setUserInfo({ email: data.messages[0].email });
        }
      } else {
        setError(data.error || "Failed to fetch messages.");
      }
    } catch (err) {
      setError("Error fetching messages: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title}>Your Dashboard</h1>
          {messages.length > 0 && (
            <div style={styles.userInfo}>
              <p style={styles.welcome}>Welcome back!</p>
              <p style={styles.email}>{userInfo.email}</p>
            </div>
          )}
        </header>

        <main style={styles.main}>
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>Loading your messages...</p>
            </div>
          ) : error ? (
            <div style={styles.error}>
              <p>{error}</p>
            </div>
          ) : messages.length > 0 ? (
            <div style={styles.messagesContainer}>
              <h2 style={styles.messagesTitle}>Your Messages</h2>
              <div style={styles.messagesList}>
                {messages.map((msg, index) => (
                  <div key={index} style={styles.messageCard}>
                    <div style={styles.messageContent}>
                      <p style={styles.messageText}>{msg.message || "No Subject"}</p>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        margin: '8px 0',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor:
                          msg.sentiment === 'positive' ? '#ECFDF5' :
                          msg.sentiment === 'negative' ? '#FEF2F2' :
                          '#F3F4F6',
                        color:
                          msg.sentiment === 'positive' ? '#065F46' :
                          msg.sentiment === 'negative' ? '#991B1B' :
                          '#4B5563',
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: `1px solid ${
                          msg.sentiment === 'positive' ? '#D1FAE5' :
                          msg.sentiment === 'negative' ? '#FEE2E2' :
                          '#E5E7EB'
                        }`
                      }}>
                        <span style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor:
                            msg.sentiment === 'positive' ? '#10B981' :
                            msg.sentiment === 'negative' ? '#EF4444' :
                            '#9CA3AF'
                        }}></span>
                        <span>
                          Sentiment: {msg.sentiment ?
                            msg.sentiment.charAt(0).toUpperCase() + msg.sentiment.slice(1) :
                            'Neutral'}
                        </span>
                      </div>
                      <p style={styles.timestamp}>{new Date(msg.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No FAQ found</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const styles = {
  /* page wrapper */
  container: {
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '2rem 1rem',
    boxSizing: 'border-box',
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  /* header */
  header: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  userInfo: {
    marginTop: '0.75rem',
  },
  welcome: {
    fontSize: '1.1rem',
    color: '#64748b',
    margin: 0,
  },
  email: {
    fontSize: '1rem',
    color: '#475569',
    fontWeight: 500,
    margin: 0,
    wordBreak: 'break-all',
  },
  /* main card */
  main: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
  },
  /* loading & error */
  loading: {
    textAlign: 'center',
    color: '#64748b',
    padding: '2rem',
  },
  spinner: {
    margin: '0 auto 1rem',
    width: '36px',
    height: '36px',
    border: '4px solid #f1f5f9',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
  },
  /* messages list */
  messagesContainer: {
    marginTop: '1.5rem',
  },
  messagesTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '1rem',
  },
  messagesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  messageCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    padding: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease',
    cursor: 'default',
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  messageText: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  },
  timestamp: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontStyle: 'italic',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
  },
  emptyText: {
    fontSize: '1.1rem',
    margin: 0,
  },
};



export default Home;
