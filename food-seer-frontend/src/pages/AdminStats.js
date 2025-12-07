import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAdminStats } from '../services/api';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const user = await getCurrentUser();

      if (user.role !== 'ROLE_ADMIN') {
        alert('Access denied. Admin privileges required.');
        navigate('/recommendations');
        return;
      }

      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBack = () => {
    navigate('/recommendations');
  };

  if (loading) {
    return <div className="admin-stats-container"><div className="loading">Loading stats...</div></div>;
  }

  if (!stats) {
    return <div className="admin-stats-container">No stats available.</div>;
  }

  return (
    <div className="admin-stats-container">
      <div className="dashboard-header">
        <h1>📊 Admin Statistics</h1>
        <button className="back-button" onClick={handleBack}>Back</button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p className="stat-number">{stats.totalOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Fulfilled Orders</h3>
          <p className="stat-number">{stats.fulfilledOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Unfulfilled Orders</h3>
          <p className="stat-number">{stats.unfulfilledOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-number">${stats.totalRevenue}</p>
        </div>
      </div>

      <div className="top-products">
        <h2>Top Products</h2>
        {(!stats.topProducts || Object.keys(stats.topProducts).length === 0) ? (
          <p>No product data available.</p>
        ) : (
          <table className="top-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.topProducts).map(([name, count]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminStats;
