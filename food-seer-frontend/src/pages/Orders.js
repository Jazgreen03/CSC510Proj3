import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrders, getCurrentUser } from '../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, fulfilled, unfulfilled
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        await getCurrentUser(); // Verify authentication
        const ordersData = await getMyOrders(); // Get only current user's orders
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const handleBack = () => {
    navigate('/recommendations');
  };

  const handleCreateOrder = () => {
    navigate('/create-order');
  };

  const getFilteredOrders = () => {
    switch (filter) {
      case 'fulfilled':
        return orders.filter(order => order.isFulfilled);
      case 'unfulfilled':
        return orders.filter(order => !order.isFulfilled);
      default:
        return orders;
    }
  };

  const getTotalPrice = (order) => {
    return order.foods.reduce((total, food) => total + food.price, 0);
  };

  if (loading) {
    return (
      <div className="orders-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading orders...</div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="orders-container" role="main" aria-labelledby="orders-heading">
      <div className="orders-header">
        <h1 id="orders-heading"><span aria-hidden="true">📦</span> My Orders</h1>
        <div className="header-actions" role="group" aria-label="Page actions">
          <button className="create-button" onClick={handleCreateOrder} aria-label="Create a new order">
            Create New Order
          </button>
          <button className="back-button" onClick={handleBack} aria-label="Go back to recommendations page">
            Back
          </button>
        </div>
      </div>

      <div className="orders-filters" role="tablist" aria-label="Order filters">
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          role="tab"
          aria-selected={filter === 'all'}
          aria-controls="orders-panel"
          aria-label={`Show all orders, ${orders.length} total`}
        >
          All Orders ({orders.length})
        </button>
        <button
          className={`filter-button ${filter === 'unfulfilled' ? 'active' : ''}`}
          onClick={() => setFilter('unfulfilled')}
          role="tab"
          aria-selected={filter === 'unfulfilled'}
          aria-controls="orders-panel"
          aria-label={`Show pending orders, ${orders.filter(o => !o.isFulfilled).length} pending`}
        >
          Pending ({orders.filter(o => !o.isFulfilled).length})
        </button>
        <button
          className={`filter-button ${filter === 'fulfilled' ? 'active' : ''}`}
          onClick={() => setFilter('fulfilled')}
          role="tab"
          aria-selected={filter === 'fulfilled'}
          aria-controls="orders-panel"
          aria-label={`Show fulfilled orders, ${orders.filter(o => o.isFulfilled).length} fulfilled`}
        >
          Fulfilled ({orders.filter(o => o.isFulfilled).length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders" role="tabpanel" id="orders-panel">
          <p>No orders found.</p>
          <button className="create-button" onClick={handleCreateOrder} aria-label="Create your first order">
            Create Your First Order
          </button>
        </div>
      ) : (
        <div className="orders-list" role="tabpanel" aria-label={`${filteredOrders.length} orders displayed`} id="orders-panel">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card" role="article" tabIndex={0} aria-labelledby={`order-title-${order.id}`} aria-describedby={`order-summary-${order.id}`}>
              <div className="order-header">
                <h3 id={`order-title-${order.id}`}>{order.name || `Order #${order.id}`}</h3>
                <span className={`status-badge ${order.isFulfilled ? 'fulfilled' : 'pending'}`} role="status" aria-label={order.isFulfilled ? 'Order fulfilled' : 'Order pending'}>
                  {order.isFulfilled ? '✓ Fulfilled' : '⏳ Pending'}
                </span>
              </div>
              
              <div className="order-details" id={`order-summary-${order.id}`}>
                <div className="order-info" role="group" aria-label="Order information">
                  <p><strong>Order ID:</strong> <span aria-label={`Order ID number ${order.id}`}>#{order.id}</span></p>
                  <p><strong>Total Items:</strong> <span aria-label={`${order.foods.length} items`}>{order.foods.length}</span></p>
                  <p><strong>Total Price:</strong> <span aria-label={`${getTotalPrice(order)} dollars`}>${getTotalPrice(order)}</span></p>
                </div>

                <div className="order-items" role="region" aria-labelledby={`order-items-heading-${order.id}`}>
                  <h4 id={`order-items-heading-${order.id}`}>Items:</h4>
                  <ul role="list" aria-label={`${order.foods.length} items in this order`}>
                    {order.foods.map((food, index) => (
                      <li key={`${food.id}-${index}`} role="listitem" aria-label={`${food.foodName}, ${food.price} dollars`}>
                        {food.foodName} - ${food.price}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;