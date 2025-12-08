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
    return (
      <div className="admin-stats-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-stats-container" role="main">
        <p role="status">No stats available.</p>
      </div>
    );
  }

  return (
    <div className="admin-stats-container" role="main" aria-labelledby="admin-stats-heading">
      <div className="dashboard-header">
        <h1 id="admin-stats-heading"><span aria-hidden="true">📊</span> Admin Statistics</h1>
        <button className="back-button" onClick={handleBack} aria-label="Go back to recommendations page">Back</button>
      </div>

      <div className="dashboard-stats" role="region" aria-label="Statistics overview">
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total orders: ${stats.totalOrders}`}>
          <h3 id="total-orders-heading">Total Orders</h3>
          <p className="stat-number" aria-labelledby="total-orders-heading">{stats.totalOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Fulfilled orders: ${stats.fulfilledOrders}`}>
          <h3 id="fulfilled-orders-heading">Fulfilled Orders</h3>
          <p className="stat-number" aria-labelledby="fulfilled-orders-heading">{stats.fulfilledOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Unfulfilled orders: ${stats.unfulfilledOrders}`}>
          <h3 id="unfulfilled-orders-heading">Unfulfilled Orders</h3>
          <p className="stat-number" aria-labelledby="unfulfilled-orders-heading">{stats.unfulfilledOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total revenue: ${stats.totalRevenue} dollars`}>
          <h3 id="total-revenue-heading">Total Revenue</h3>
          <p className="stat-number" aria-labelledby="total-revenue-heading">${stats.totalRevenue}</p>
        </div>
      </div>

      <div className="top-products" role="region" aria-labelledby="top-products-heading">
        <h2 id="top-products-heading">Top Products</h2>
        {(!stats.topProducts || Object.keys(stats.topProducts).length === 0) ? (
          <p role="status">No product data available.</p>
        ) : (
          <table className="top-products-table" role="table" aria-label="Top products by order count">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.topProducts).map(([name, count]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td aria-label={`${count} orders`}>{count}</td>
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