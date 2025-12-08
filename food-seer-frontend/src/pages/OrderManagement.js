import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnfulfilledOrders, getFulfilledOrders, fulfillOrder, getCurrentUser } from '../services/api';

const OrderManagement = () => {
  const [unfulfilledOrders, setUnfulfilledOrders] = useState([]);
  const [fulfilledOrders, setFulfilledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('unfulfilled'); // unfulfilled or fulfilled
  const [processing, setProcessing] = useState({});
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const user = await getCurrentUser();
      
      // Check if user has staff or admin role
      if (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_STAFF') {
        alert('Access denied. Staff or Admin privileges required.');
        navigate('/');
        return;
      }

      const unfulfilled = await getUnfulfilledOrders();
      const fulfilled = await getFulfilledOrders();
      setUnfulfilledOrders(unfulfilled);
      setFulfilledOrders(fulfilled);
    } catch (error) {
      console.error('Error fetching orders:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFulfillOrder = async (orderId) => {
    if (!window.confirm('Mark this order as fulfilled?')) {
      return;
    }

    setProcessing(prev => ({ ...prev, [orderId]: true }));
    
    try {
      await fulfillOrder(orderId);
      alert('Order fulfilled successfully!');
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Failed to fulfill order. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getTotalPrice = (order) => {
    return order.foods.reduce((total, food) => total + food.price, 0);
  };

  const handleBack = () => {
    navigate('/inventory-management');
  };

  if (loading) {
    return (
      <div className="staff-dashboard-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading dashboard...</div>
      </div>
    );
  }

  const displayOrders = view === 'unfulfilled' ? unfulfilledOrders : fulfilledOrders;

  return (
    <div className="staff-dashboard-container" role="main" aria-labelledby="order-mgmt-heading">
      <div className="dashboard-header">
        <h1 id="order-mgmt-heading"><span aria-hidden="true">📦</span> Order Management</h1>
        <button className="back-button" onClick={handleBack} aria-label="Go back to inventory management">
          Back
        </button>
      </div>

      <div className="dashboard-stats" role="region" aria-label="Order statistics">
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Pending orders: ${unfulfilledOrders.length}`}>
          <h3 id="pending-orders-stat">Pending Orders</h3>
          <p className="stat-number" aria-labelledby="pending-orders-stat">{unfulfilledOrders.length}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Fulfilled today: ${fulfilledOrders.length}`}>
          <h3 id="fulfilled-today-stat">Fulfilled Today</h3>
          <p className="stat-number" aria-labelledby="fulfilled-today-stat">{fulfilledOrders.length}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total orders: ${unfulfilledOrders.length + fulfilledOrders.length}`}>
          <h3 id="total-orders-stat">Total Orders</h3>
          <p className="stat-number" aria-labelledby="total-orders-stat">{unfulfilledOrders.length + fulfilledOrders.length}</p>
        </div>
      </div>

      <div className="view-toggle" role="tablist" aria-label="Order view selection">
        <button
          className={`toggle-button ${view === 'unfulfilled' ? 'active' : ''}`}
          onClick={() => setView('unfulfilled')}
          role="tab"
          aria-selected={view === 'unfulfilled'}
          aria-controls="orders-panel"
          aria-label={`View pending orders, ${unfulfilledOrders.length} orders`}
        >
          Pending Orders ({unfulfilledOrders.length})
        </button>
        <button
          className={`toggle-button ${view === 'fulfilled' ? 'active' : ''}`}
          onClick={() => setView('fulfilled')}
          role="tab"
          aria-selected={view === 'fulfilled'}
          aria-controls="orders-panel"
          aria-label={`View fulfilled orders, ${fulfilledOrders.length} orders`}
        >
          Fulfilled Orders ({fulfilledOrders.length})
        </button>
      </div>

      {displayOrders.length === 0 ? (
        <div className="no-orders" role="tabpanel" id="orders-panel" aria-labelledby={view === 'unfulfilled' ? 'pending-tab' : 'fulfilled-tab'}>
          <p>No {view} orders at this time.</p>
        </div>
      ) : (
        <div className="orders-list" role="tabpanel" aria-label={`${view === 'unfulfilled' ? 'Pending' : 'Fulfilled'} orders list`} id="orders-panel">
          {displayOrders.map(order => (
            <div key={order.id} className={`order-card ${view === 'unfulfilled' ? 'pending' : 'completed'}`} role="article" aria-labelledby={`order-title-${order.id}`}>
              <div className="order-header">
                <div className="order-title">
                  <h3 id={`order-title-${order.id}`}>{order.name || `Order #${order.id}`}</h3>
                  <span className="order-id" aria-label={`Order ID number ${order.id}`}>ID: #{order.id}</span>
                </div>
                {view === 'unfulfilled' ? (
                  <button
                    className="fulfill-button"
                    onClick={() => handleFulfillOrder(order.id)}
                    disabled={processing[order.id]}
                    aria-label={processing[order.id] ? `Processing order ${order.name || order.id}` : `Mark order ${order.name || order.id} as fulfilled`}
                    aria-disabled={processing[order.id]}
                  >
                    {processing[order.id] ? 'Processing...' : '✓ Fulfill Order'}
                  </button>
                ) : (
                  <span className="fulfilled-badge" role="status" aria-label="Order fulfilled"><span aria-hidden="true">✓</span> Fulfilled</span>
                )}
              </div>

              <div className="order-summary" role="group" aria-label="Order summary">
                <div className="summary-item">
                  <span className="label">Total Items:</span>
                  <span className="value" aria-label={`${order.foods.length} items`}>{order.foods.length}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Price:</span>
                  <span className="value" aria-label={`Total price ${getTotalPrice(order)} dollars`}>${getTotalPrice(order)}</span>
                </div>
              </div>

              <div className="order-items-detail" role="region" aria-labelledby={`order-items-heading-${order.id}`}>
                <h4 id={`order-items-heading-${order.id}`}>Order Items:</h4>
                <table className="items-table" role="table" aria-label={`Items in order ${order.name || order.id}`}>
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Price</th>
                      <th scope="col">Allergies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.foods.map((food, index) => (
                      <tr key={`${food.id}-${index}`}>
                        <td>{food.foodName}</td>
                        <td aria-label={`${food.price} dollars`}>${food.price}</td>
                        <td aria-label={food.allergies && food.allergies.length > 0 ? `Contains ${food.allergies.join(', ')}` : 'No allergens'}>{food.allergies && food.allergies.length > 0 
                          ? food.allergies.join(', ') 
                          : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;