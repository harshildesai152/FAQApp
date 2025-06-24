import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const Admin = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/users/getAllEmailMessage", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        setAllData(data || []);
      } else {
        setError(data.error || "Failed to fetch messages.");
      }
    } catch (err) {
      setError("Error fetching messages: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id, currentMessage) => {
    setEditId(id);
    setEditMessage(currentMessage);
  };

  const handleUpdate = async () => {
    if (!editMessage.trim()) return toast.warn("Message can't be empty");

    try {
      const res = await fetch(`http://localhost:5000/users/update-message/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: editMessage }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Message updated");
        setEditId(null);
        setEditMessage("");
        fetchMessages();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`http://localhost:5000/users/delete-message/${confirmDeleteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Message deleted");
        fetchMessages();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !newMessage) {
      toast.warn("Email and message required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/users/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: newEmail, message: newMessage }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Email sent successfully");
        setNewEmail("");
        setNewMessage("");
        fetchMessages();
      } else {
        toast.error(data.error || "Sending email failed");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  // Function to download messages as CSV
  const downloadCSV = () => {
    if (allData.length === 0) {
      toast.warn("No data to download");
      return;
    }

    // Prepare data for CSV
    const csvData = [];
    allData.forEach(user => {
      user.email_messages.forEach(msg => {
        csvData.push({
          "User Email": user.email,
          "Message": msg.message,
          "Sentiment": msg.sentiment || "neutral",
          "Timestamp": new Date(msg.timestamp).toLocaleString()
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Messages");
    XLSX.writeFile(workbook, "faq_messages.xlsx");
    toast.success("Downloaded as Excel file");
  };

  // Function to download messages as PDF
  const downloadPDF = () => {
    if (allData.length === 0) {
      toast.warn("No data to download");
      return;
    }

    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.text("FAQ Messages Report", 105, yPos, { align: "center" });
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos, { align: "center" });
    yPos += 20;
    
    allData.forEach((user, userIndex) => {
      if (userIndex > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`User: ${user.email}`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`Total Messages: ${user.email_messages.length}`, 14, yPos);
      yPos += 15;
      
      user.email_messages.forEach((msg, msgIndex) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Message content
        const splitText = doc.splitTextToSize(msg.message, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 7;
        
        // Sentiment
        doc.setTextColor(
          msg.sentiment === "positive" ? "#065F46" :
          msg.sentiment === "negative" ? "#991B1B" : "#4B5563"
        );
        doc.text(`Sentiment: ${msg.sentiment || "neutral"}`, 14, yPos);
        yPos += 7;
        
        // Timestamp
        doc.setTextColor(100);
        doc.text(`Sent: ${new Date(msg.timestamp).toLocaleString()}`, 14, yPos);
        yPos += 15;
        
        // Reset color
        doc.setTextColor(0, 0, 0);
        
        // Add separator if not last message
        if (msgIndex < user.email_messages.length - 1) {
          doc.line(14, yPos, 196, yPos);
          yPos += 10;
        }
      });
    });

    doc.save("faq_messages.pdf");
    toast.success("Downloaded as PDF file");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Admin Dashboard</h1>
      </div>

      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading messages...</p>
        </div>
      )}

      {error && (
        <div style={styles.errorContainer}>
          <p>{error}</p>
        </div>
      )}

      <div style={styles.content}>
        {/* Download Options */}
        <div style={styles.downloadOptions}>
          <button onClick={downloadPDF} style={styles.downloadButton}>
            Download as PDF
          </button>
          <button onClick={downloadCSV} style={styles.downloadButton}>
            Download as Excel
          </button>
        </div>

        {/* Send Email Form */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Send New FAQ</h2>
          <form onSubmit={handleSendEmail} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Recipient Email</label>
              <select
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select Email</option>
                {allData.map((user, idx) => (
                  <option key={idx} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>FAQ</label>
              <textarea
                placeholder="Enter your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={5}
                style={styles.textarea}
                required
              />
            </div>

            <button type="submit" style={styles.primaryButton}>
              Send Message
            </button>
          </form>
        </div>

        {/* User Messages */}
        <div style={styles.messagesContainer}>
          <h2 style={styles.sectionTitle}>User FAQ </h2>

          {allData.length > 0 ? (
            allData.map((user, i) => (
              <div key={i} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <h3 style={styles.userEmail}>{user.email}</h3>
                  <span style={styles.messageCount}>
                    {user.email_messages.length} messages
                  </span>
                </div>

                {user.email_messages.length > 0 && (
                  <div style={styles.messageList}>
                    {user.email_messages.map((msg, idx) => (
                      <div key={idx} style={styles.messageItem}>
                        {editId === msg._id ? (
                          <div style={styles.editContainer}>
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              style={styles.editTextarea}
                            />
                            <div style={styles.editButtons}>
                              <button
                                onClick={handleUpdate}
                                style={styles.saveButton}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                style={styles.cancelButton}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={styles.messageContent}>
                              <p style={styles.messageText}>{msg.message}</p>
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
                              <p style={styles.timestamp}>
                                {new Date(msg.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div style={styles.messageActions}>
                              <button
                                onClick={() => handleEdit(msg._id, msg.message)}
                                style={styles.editButton}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(msg._id)}
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            !loading && (
              <div style={styles.emptyState}>
                <p>No user FAQ found.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Confirm Deletion</h3>
            <p>Are you sure you want to delete this message?</p>
            <div style={styles.modalButtons}>
              <button
                onClick={handleDeleteConfirm}
                style={styles.confirmButton}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={styles.cancelModalButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#f5f7fa",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "1.5rem 2rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.8rem",
    fontWeight: "600",
  },
  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem",
  },
  downloadOptions: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    justifyContent: "flex-end",
  },
  downloadButton: {
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
    padding: "1.5rem",
    marginBottom: "2rem",
  },
  cardTitle: {
    color: "#374151",
    marginTop: 0,
    marginBottom: "1.5rem",
    fontSize: "1.3rem",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    color: "#4b5563",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  select: {
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "1rem",
    backgroundColor: "#f9fafb",
    transition: "all 0.2s",
  },
  textarea: {
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "1rem",
    backgroundColor: "#f9fafb",
    resize: "vertical",
    minHeight: "100px",
    transition: "all 0.2s",
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    alignSelf: "flex-start",
    transition: "all 0.2s",
  },
  messagesContainer: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
    padding: "1.5rem",
  },
  sectionTitle: {
    color: "#374151",
    marginTop: 0,
    marginBottom: "1.5rem",
    fontSize: "1.3rem",
    fontWeight: "600",
  },
  userCard: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "1.5rem",
    marginBottom: "1.5rem",
  },
  userHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  userEmail: {
    margin: 0,
    color: "#111827",
    fontSize: "1.1rem",
  },
  messageCount: {
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: "500",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  messageItem: {
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    padding: "1rem",
    transition: "all 0.2s",
  },
  messageContent: {
    marginBottom: "0.5rem",
  },
  messageText: {
    margin: 0,
    color: "#374151",
    lineHeight: "1.5",
  },
  timestamp: {
    margin: "0.5rem 0 0",
    color: "#6b7280",
    fontSize: "0.8rem",
  },
  messageActions: {
    display: "flex",
    gap: "0.5rem",
  },
  editButton: {
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  editContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  editTextarea: {
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "1rem",
    minHeight: "100px",
    resize: "vertical",
  },
  editButtons: {
    display: "flex",
    gap: "0.5rem",
  },
  saveButton: {
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#e5e7eb",
    color: "#4b5563",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1.5rem",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "1rem",
    color: "#111827",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
    marginTop: "1.5rem",
  },
  confirmButton: {
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  },
  cancelModalButton: {
    backgroundColor: "#e5e7eb",
    color: "#4b5563",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  spinner: {
    border: "4px solid rgba(0, 0, 0, 0.1)",
    borderLeftColor: "#4f46e5",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    marginBottom: "1rem",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "1rem",
    borderRadius: "6px",
    margin: "1rem 0",
  },
  emptyState: {
    textAlign: "center",
    padding: "2rem",
    color: "#6b7280",
  },
};

export default Admin;