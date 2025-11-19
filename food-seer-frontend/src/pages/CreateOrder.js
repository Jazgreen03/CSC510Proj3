import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllFoods, createOrder, getCurrentUser } from '../services/api';

const CreateOrder = () => {
  const [foods, setFoods] = useState([]);
  const [cart, setCart] = useState({});
  const [orderName, setOrderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        await getCurrentUser(); // Verify authentication
        const foodsData = await getAllFoods();
        // Only show foods that are in stock
        setFoods(foodsData.filter(food => food.amount > 0));
      } catch (error) {
        console.error('Error fetching foods:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, [navigate]);

  // Handle food from chatbot recommendation
  useEffect(() => {
    if (location.state?.addToCart && foods.length > 0) {
      const recommendedFood = location.state.addToCart;
      
      // Check if the food is in stock
      const foodInStock = foods.find(f => f.id === recommendedFood.id);
      
      if (foodInStock) {
        // Add to cart
        setCart(prev => ({
          ...prev,
          [foodInStock.id]: {
            food: foodInStock,
            quantity: (prev[foodInStock.id]?.quantity || 0) + 1
          }
        }));
        
        // Show notification
        setNotification(`✅ ${foodInStock.foodName} has been added to your cart!`);
        setTimeout(() => setNotification(null), 5000);
      } else {
        // Show out of stock notification
        setNotification(`⚠️ Sorry, ${recommendedFood.foodName} is currently out of stock.`);
        setTimeout(() => setNotification(null), 5000);
      }
      
      // Clear the state to prevent re-adding on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state, foods]);

  const addToCart = (food) => {
    setCart(prev => ({
      ...prev,
      [food.id]: {
        food,
        quantity: (prev[food.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromCart = (foodId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[foodId].quantity > 1) {
        newCart[foodId].quantity -= 1;
      } else {
        delete newCart[foodId];
      }
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const getTotalPrice = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + (item.food.price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + item.quantity;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (getTotalItems() === 0) {
      alert('Please add items to your cart before placing an order.');
      return;
    }

    if (!orderName.trim()) {
      alert('Please enter a name for your order.');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare order data - send foods with only id field for backend processing
      const orderFoods = Object.values(cart).flatMap(item => 
        Array(item.quantity).fill({ id: item.food.id })
      );

      const orderData = {
        name: orderName,
        foods: orderFoods,
        isFulfilled: false
      };

      console.log('Sending order data:', orderData); // Debug log
      await createOrder(orderData);
      alert('Order placed successfully!');

     // UPDATE FRONTEND STOCK AFTER ORDER IS PLACED
    setFoods(prevFoods =>
      prevFoods.map(f => {
        // Count how many of this food were ordered
        const quantityOrdered = orderFoods.filter(of => of.id === f.id).length;
        return { ...f, amount: f.amount - quantityOrdered };
      })
    );

    // Clear cart and order name
    setCart({});
    setOrderName('');

      // navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFoods = foods.filter(food =>
    food.foodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="create-order-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="create-order-container">
      <div className="create-order-header">
        <h1>🛒 Create New Order</h1>
        <button className="back-button" onClick={() => navigate('/recommendations')}>
          Back
        </button>
      </div>

      {notification && (
        <div className="notification-banner">
          {notification}
        </div>
      )}

      <div className="order-content">
        <div className="foods-section">
          <h2>Available Foods</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search foods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredFoods.length === 0 ? (
            <p>No foods available for ordering.</p>
          ) : (
            <div className="foods-list">
              {filteredFoods.map(food => (
                <div key={food.id} className="food-item">
                  <div className="food-item-info">
                    <h3>{food.foodName}</h3>
                    <p>Price: ${food.price} | Stock: {food.amount}</p>
                    {food.allergies && food.allergies.length > 0 && (
                      <p className="allergies-text">Allergies: {food.allergies.join(', ')}</p>
                    )}
                  </div>
                  <button
                    className="add-button"
                    onClick={() => addToCart(food)}
                    disabled={cart[food.id]?.quantity >= food.amount}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cart-section">
          <h2>Your Cart</h2>
          
          <div className="order-name-input">
            <label htmlFor="orderName">Order Name:</label>
            <input
              type="text"
              id="orderName"
              placeholder="e.g., Lunch Order"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="text-input"
            />
          </div>

          {getTotalItems() === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {Object.values(cart).map(item => (
                  <div key={item.food.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.food.foodName}</h4>
                      <p>
                        ${item.food.price} × {item.quantity} = ${item.food.price * item.quantity}
                      </p>
                    </div>
                    <div className="cart-item-actions">
                      <button
                        className="quantity-button"
                        onClick={() => removeFromCart(item.food.id)}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="quantity-button"
                        onClick={() => addToCart(item.food)}
                        disabled={item.quantity >= item.food.amount}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Total Items:</span>
                  <span>{getTotalItems()}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Price:</span>
                  <span>${getTotalPrice()}</span>
                </div>
              </div>

              <div className="cart-actions">
                <button
                  className="clear-button"
                  onClick={clearCart}
                  disabled={submitting}
                >
                  Clear Cart
                </button>
                <button
                  className="submit-button"
                  onClick={handleSubmitOrder}
                  disabled={submitting || !orderName.trim()}
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;

