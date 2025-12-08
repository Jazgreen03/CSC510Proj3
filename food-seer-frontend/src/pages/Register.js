import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(formData.username, formData.email, formData.password);
      // Success! Navigate to login with success message
      navigate('/', { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      if (err.message.includes('Username already taken')) {
        setError('Username already taken. Please choose another.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" aria-label="Registration page container" tabIndex="0">
      <div className="login-card" aria-label="Registration form card" tabIndex="0">
        <div className="login-header" aria-label="Registration header" tabIndex="0">
          <h1 className="app-title" aria-label="FoodSeer application title" tabIndex="0">🍽️ FoodSeer</h1>
          <p className="app-subtitle" aria-label="Registration subtitle" tabIndex="0">Create your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form" aria-label="Registration form" tabIndex="0">
          <div className="form-group" aria-label="Username input group" tabIndex="0">
            <label htmlFor="username" aria-label="Username label">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
              aria-label="Username input field"
              tabIndex="0"
            />
          </div>

          <div className="form-group" aria-label="Email input group" tabIndex="0">
            <label htmlFor="email" aria-label="Email label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              aria-label="Email input field"
              tabIndex="0"
            />
          </div>
          
          <div className="form-group" aria-label="Password input group" tabIndex="0">
            <label htmlFor="password" aria-label="Password label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              autoComplete="new-password"
              aria-label="Password input field"
              tabIndex="0"
            />
          </div>

          <div className="form-group" aria-label="Confirm password input group" tabIndex="0">
            <label htmlFor="confirmPassword" aria-label="Confirm password label">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              aria-label="Confirm password input field"
              tabIndex="0"
            />
          </div>
          
          {error && <div className="error-message" aria-label={`Error message: ${error}`} tabIndex="0">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
            aria-label={loading ? 'Creating account, please wait' : 'Register button'}
            tabIndex="0"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <div className="login-footer" aria-label="Login link section" tabIndex="0">
          <p className="register-link" aria-label="Already have an account message" tabIndex="0">
            Already have an account? <Link to="/" aria-label="Link to login page" tabIndex="0">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;