import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, getCurrentUser } from '../services/api';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = await getCurrentUser();
        
        // Check if user is admin
        if (user.role !== 'ROLE_ADMIN') {
          alert('Access denied. Admin privileges required.');
          navigate('/recommendations');
          return;
        }

        const statsData = await getAdminStats();
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container">
        <h1>Admin Statistics</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Admin Statistics</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container">
        <h1>Admin Statistics</h1>
        <p>No statistics available</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Admin Statistics</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p className="stat-value">{stats.totalOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Fulfilled Orders</h3>
          <p className="stat-value">{stats.fulfilledOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Unfulfilled Orders</h3>
          <p className="stat-value">{stats.unfulfilledOrders || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value">${(stats.totalRevenue || 0).toFixed(2)}</p>
        </div>
      </div>

      {stats.topProducts && Object.keys(stats.topProducts).length > 0 && (
        <div className="top-products-section">
          <h2>Top Products</h2>
          <ul className="top-products-list">
            {Object.entries(stats.topProducts).map(([product, count]) => (
              <li key={product} className="top-product-item">
                <span className="product-name">{product}</span>
                <span className="product-count">{count} orders</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminStats;

