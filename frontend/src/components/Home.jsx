import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./HomeStyles.css";

const Home = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-container">
        <h1>Welcome to Ranked Choice Voting</h1>
        <p>
          This is a poll website where you can create polls and share them with
          friends. We use the Instant Runoff Voting (IRV) algorithm to ensure
          fair and democratic results.
        </p>
      </div>

      <div className="home-container">
        <h2>How Instant Runoff Voting Works</h2>
        <p>
          Instant Runoff Voting allows voters to rank candidates in order of
          preference. If no candidate receives a majority of first-choice votes,
          the candidate with the fewest votes is eliminated, and their votes are
          redistributed to the next choice. This process continues until one
          candidate receives a majority, ensuring that the winner has broad
          support from voters.
        </p>
      </div>

      <div className="home-container signup-container">
        {user ? (
          <>
            <h2>Create a poll to get started</h2>
            <button
              className="signup-button"
              onClick={() => navigate("/polls/new")}
            >
              Create New Poll
            </button>
          </>
        ) : (
          <>
            <h2>Sign up to start</h2>
            <Link to="/signup" className="signup-button">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
