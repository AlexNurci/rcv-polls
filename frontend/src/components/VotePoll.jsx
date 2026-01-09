import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../shared";
import "./VotePollStyles.css";

const VotePoll = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchPoll();
  }, [id]);

  useEffect(() => {
    if (poll && isInactive()) {
      fetchResults();
    }
  }, [poll]);

  const fetchPoll = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/public/${id}`);
      setPoll(response.data.poll);
      // Initialize rankings array with empty ranks
      setRankings(
        response.data.poll.options.map((option) => ({
          option,
          rank: null,
        }))
      );
    } catch (error) {
      console.error("Error fetching poll:", error);
      setPoll(null);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false; // No expiration date means never expires
    return new Date(expiresAt) < new Date();
  };

  const isInactive = () => {
    return poll && (poll.isClosed || isExpired(poll.expiresAt));
  };

  const handleRankChange = (optionIndex, newRank) => {
    setRankings((prev) => {
      const updated = [...prev];
      const newRankValue = newRank === "" ? null : parseInt(newRank);
      
      // Find if another option already has this rank
      const existingIndex = updated.findIndex(
        (item, idx) => idx !== optionIndex && item.rank === newRankValue
      );

      if (existingIndex !== -1 && newRankValue !== null) {
        // Swap ranks - give the existing option the old rank
        updated[existingIndex].rank = updated[optionIndex].rank;
      }
      updated[optionIndex].rank = newRankValue;
      return updated;
    });
  };

  const handleClosePoll = async () => {
    if (!window.confirm("Are you sure you want to close this poll?")) {
      return;
    }

    try {
      await axios.put(
        `${API_URL}/api/polls/${id}`,
        { isClosed: true },
        {
          withCredentials: true,
        }
      );
      setPoll({ ...poll, isClosed: true });
      // Fetch results after closing
      await fetchResults();
    } catch (error) {
      console.error("Error closing poll:", error);
      alert("Failed to close poll");
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/${id}/results`);
      setResults(response.data.results);
    } catch (error) {
      if (error.response?.status !== 400) {
        console.error("Error fetching results:", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInactive()) {
      alert("This poll is no longer accepting votes");
      return;
    }

    // Validate that all options are ranked
    const rankedOptions = rankings.filter((r) => r.rank !== null);
    if (rankedOptions.length !== poll.options.length) {
      alert("Please rank all options before submitting");
      return;
    }

    // Validate no duplicate ranks
    const ranks = rankedOptions.map((r) => r.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      alert("Each option must have a unique rank");
      return;
    }

    setIsSubmitting(true);
    try {
      const rankingsToSubmit = rankings
        .filter((r) => r.rank !== null)
        .map((r) => ({
          option: r.option,
          rank: r.rank,
        }));

      await axios.post(
        `${API_URL}/api/polls/${id}/vote`,
        { rankings: rankingsToSubmit },
        {
          withCredentials: true,
        }
      );

      setHasVoted(true);
      alert("Vote submitted successfully!");
      
      // Refresh poll to check if it should show results
      await fetchPoll();
    } catch (error) {
      console.error("Error submitting vote:", error);
      alert(error.response?.data?.error || "Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="vote-poll-container">Loading...</div>;
  }

  if (!poll) {
    return (
      <div className="vote-poll-container">
        <p>Poll not found</p>
      </div>
    );
  }

  const isCreator = user && user.id === poll.creatorId;

  return (
    <div className="vote-poll-container">
      <div className="vote-poll-card">
        <div className="poll-header">
          <h1>{poll.name}</h1>
          {isInactive() && (
            <span className="inactive-badge">
              {poll.isClosed ? "Inactive" : "Expired"}
            </span>
          )}
        </div>

        {isCreator && !poll.isClosed && (
          <div className="creator-actions">
            <button className="close-poll-btn" onClick={handleClosePoll}>
              Close Poll
            </button>
          </div>
        )}

        {isInactive() ? (
          <div className="poll-inactive-message">
            <p>This poll is no longer accepting votes.</p>
            {results && (
              <div className="results-container">
                <h3>Results</h3>
                {results.winner ? (
                  <div className="winner">
                    <h4>Winner: {results.winner}</h4>
                  </div>
                ) : (
                  <p>{results.message || "No winner determined."}</p>
                )}
                <div className="rounds">
                  {results.rounds.map((round, index) => (
                    <div key={index} className="round">
                      <h4>Round {round.round}</h4>
                      <ul className="vote-counts">
                        {Object.entries(round.voteCounts).map(([option, count]) => (
                          <li key={option}>
                            {option}: {count} votes
                          </li>
                        ))}
                      </ul>
                      {round.eliminated && (
                        <p className="eliminated">
                          {round.eliminated} eliminated
                        </p>
                      )}
                      {round.winner && (
                        <p className="winner-text">Winner: {round.winner}</p>
                      )}
                    </div>
                  ))}
                </div>
                {results.totalVotes && (
                  <p className="total-votes">
                    Total votes: {results.totalVotes}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : hasVoted ? (
          <div className="vote-success-message">
            <p>Thank you! Your vote has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="vote-form">
            <h2>Rank your choices (1 = first choice, 2 = second choice, etc.)</h2>
            <div className="rankings-list">
              {poll.options.map((option, index) => {
                const rankingItem = rankings.find((r) => r.option === option);
                return (
                  <div key={index} className="ranking-item">
                    <label>{option}</label>
                    <select
                      value={rankingItem?.rank || ""}
                      onChange={(e) =>
                        handleRankChange(
                          rankings.findIndex((r) => r.option === option),
                          e.target.value
                        )
                      }
                      disabled={isInactive()}
                    >
                      <option value="">Select rank</option>
                      {poll.options.map((_, rankIndex) => (
                        <option key={rankIndex} value={rankIndex + 1}>
                          {rankIndex + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <button
              type="submit"
              className="submit-vote-btn"
              disabled={isSubmitting || isInactive()}
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VotePoll;
