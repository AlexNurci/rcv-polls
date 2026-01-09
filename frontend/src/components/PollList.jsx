import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./PollListStyles.css";

const PollList = ({ user }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchPolls();
  }, [user]);

  const fetchPolls = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls`, {
        withCredentials: true,
      });
      setPolls(response.data.polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false; // No expiration date means never expires
    return new Date(expiresAt) < new Date();
  };

  const isInactive = (poll) => {
    return poll.isClosed || isExpired(poll.expiresAt);
  };

  const handleEdit = (pollId) => {
    navigate(`/polls/${pollId}/edit`);
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/polls/${pollId}`, {
        withCredentials: true,
      });
      // Remove poll from state
      setPolls(polls.filter((poll) => poll.id !== pollId));
    } catch (error) {
      console.error("Error deleting poll:", error);
      alert("Failed to delete poll");
    }
  };

  const handleCopyLink = async (pollId) => {
    const link = `${window.location.origin}/vote/${pollId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copied to clipboard!");
    }
  };

  const handlePollClick = (pollId) => {
    navigate(`/vote/${pollId}`);
  };

  if (loading) {
    return <div className="poll-list-container">Loading...</div>;
  }

  return (
    <div className="poll-list-container">
      <div className="poll-list-header">
        <h1>My Polls</h1>
        <button className="new-poll-btn" onClick={() => navigate("/polls/new")}>
          New Poll
        </button>
      </div>

      <div className="polls-grid">
        {polls.length === 0 ? (
          <p className="no-polls">No polls yet. Create your first poll!</p>
        ) : (
          polls.map((poll) => (
            <div
              key={poll.id}
              className={`poll-card ${isInactive(poll) ? "inactive" : ""}`}
              onClick={() => handlePollClick(poll.id)}
            >
              <div className="poll-card-header">
                <h3 className="poll-name">{poll.name}</h3>
                <span
                  className={`poll-status ${
                    poll.isClosed
                      ? "closed"
                      : poll.expiresAt && isExpired(poll.expiresAt)
                      ? "expired"
                      : "active"
                  }`}
                >
                  {poll.isClosed
                    ? "Inactive"
                    : poll.expiresAt && isExpired(poll.expiresAt)
                    ? "Expired"
                    : "Active"}
                </span>
              </div>
              <p className="poll-creator">
                Creator: {poll.creator?.username || "Unknown"}
              </p>
              <div className="poll-card-footer" onClick={(e) => e.stopPropagation()}>
                <button
                  className="copy-link-btn"
                  onClick={() => handleCopyLink(poll.id)}
                  title="Copy shareable link"
                >
                  Copy
                </button>
                <button
                  className="edit-poll-btn"
                  onClick={() => handleEdit(poll.id)}
                >
                  Edit
                </button>
                <button
                  className="delete-poll-btn"
                  onClick={() => handleDelete(poll.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PollList;
