import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login, getCurrentUser } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      
      // Fetch user data to determine role and redirect accordingly
      const user = await getCurrentUser();
      
      if (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_STAFF') {
        // Admins and Staff skip customer flow, go directly to Order Management
        navigate('/order-management');
      } else {
        // Standard users go to preferences
        navigate('/preferences');
      }
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" role="main" aria-labelledby="app-title">
      <div className="login-card">
        <div className="login-header" role="banner">
          <h1 className="app-title" id="app-title"><span aria-hidden="true">🍽️</span> FoodSeer</h1>
          <p className="app-subtitle">Find your perfect meal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form" aria-labelledby="app-title">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              aria-required="true"
              aria-label="Enter your username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              aria-required="true"
              aria-label="Enter your password"
            />
          </div>
          
          {successMessage && <div className="success-message" role="status" aria-live="polite">{successMessage}</div>}
          {error && <div className="error-message" role="alert" aria-live="assertive">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
            aria-label={loading ? 'Logging in, please wait' : 'Login to your account'}
            aria-disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-footer" role="contentinfo">
          <p className="demo-info" aria-label="Demo credentials available: username admin, password admin123">
            Demo credentials: <strong>admin</strong> / <strong>admin123</strong>
          </p>
          <p className="register-link">
            Don't have an account? <Link to="/register" aria-label="Go to registration page">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;