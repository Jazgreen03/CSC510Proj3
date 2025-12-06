import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyticsOverview, getCurrentUser } from '../services/api';

const AnalyticsOverview = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const user = await getCurrentUser();
        
        // Check if user is admin
        if (user.role !== 'ROLE_ADMIN') {
          alert('Access denied. Admin privileges required.');
          navigate('/recommendations');
          return;
        }

        const analyticsData = await getAnalyticsOverview();
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching analytics overview:', err);
        setError('Failed to load analytics overview');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container">
        <h1>Analytics Overview</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Analytics Overview</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container">
        <h1>Analytics Overview</h1>
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Analytics Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p className="stat-value">{analytics.totalOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Fulfilled Orders</h3>
          <p className="stat-value">{analytics.fulfilledOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Unfulfilled Orders</h3>
          <p className="stat-value">{analytics.unfulfilledOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value">${(analytics.totalRevenue || 0).toFixed(2)}</p>
        </div>
        
        <div className="stat-card">
          <h3>Average Order Value</h3>
          <p className="stat-value">${(analytics.avgOrderValue || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;

