import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Check auth status on mount & route change
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/users/auth-check', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          setUserRole(data.role);
        } else {
          setIsLoggedIn(false);
          setUserRole('');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoggedIn(false);
        setUserRole('');
      }
    };

    checkAuth();
  }, [location]);

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5000/users/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoggedIn(false);
        setUserRole('');
        navigate('/login');
      } else {
        console.error('Logout failed:', data.error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
                  {isLoggedIn && userRole === 'manager' ? (
            <Link to="/admin" className="brand-logo">MyApp</Link>
          ) : (
            <Link to="/" className="brand-logo">MyApp</Link>
          )}
        </div>
        
        <div className="navbar-menu">
          {isLoggedIn ? (
            <>
              <div className="navbar-links">
                {userRole === 'manager' ? (
                  <Link to="/admin" className="navbar-link">Admin Dashboard</Link>
                ) : (
                  <Link to="/" className="navbar-link">Home</Link>
                )}
              </div>
              
              <div className="navbar-actions">
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-links">
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/signup" className="signup-button">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;