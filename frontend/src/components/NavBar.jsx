import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavBarStyles.css";

const NavBar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">TTP Winter</Link>
        {user && <span className="username-greeting">Hello, {user.username}!</span>}
      </div>

      <div className="nav-links">
        {user && (
          <Link to="/polls" className="nav-link">
            Poll List
          </Link>
        )}
        <div className="auth-links">
          {user ? (
            <button className="logout-btn" onClick={handleLogout}>
              LOGOUT
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="nav-link">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
