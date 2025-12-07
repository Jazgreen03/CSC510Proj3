import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllFoods, getCurrentUser } from '../services/api';

const Inventory = () => {
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, price, amount
  const [filterInStock, setFilterInStock] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        await getCurrentUser(); // Verify authentication
        const foodsData = await getAllFoods();
        setFoods(foodsData);
        setFilteredFoods(foodsData);
      } catch (error) {
        console.error('Error fetching foods:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, [navigate]);

  useEffect(() => {
    let result = [...foods];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(food =>
        food.foodName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply in-stock filter
    if (filterInStock) {
      result = result.filter(food => food.amount > 0);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.foodName.localeCompare(b.foodName);
        case 'price':
          return a.price - b.price;
        case 'amount':
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

    setFilteredFoods(result);
  }, [foods, searchTerm, sortBy, filterInStock]);

  const handleBack = () => {
    navigate('/recommendations');
  };

  const handleCreateOrder = () => {
    navigate('/create-order');
  };

  if (loading) {
    return (
      <div className="inventory-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="inventory-container" role="main" aria-labelledby="inventory-heading">
      <div className="inventory-header">
        <h1 id="inventory-heading"><span aria-hidden="true">🏪</span> Food Inventory</h1>
        <div className="header-actions" role="group" aria-label="Navigation actions">
          <button className="nav-button" onClick={handleCreateOrder} aria-label="Go to create order page">
            Create Order
          </button>
          <button className="back-button" onClick={handleBack} aria-label="Go back to recommendations page">
            Back to Recommendations
          </button>
        </div>
      </div>

      <div className="inventory-controls" role="region" aria-label="Inventory filters and search">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search foods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search for food items by name"
          />
        </div>

        <div className="filter-controls" role="group" aria-label="Filter and sort options">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filterInStock}
              onChange={(e) => setFilterInStock(e.target.checked)}
              aria-label="Show only items in stock"
            />
            In Stock Only
          </label>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
            aria-label="Sort food items by"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="amount">Sort by Stock</option>
          </select>
        </div>
      </div>

      <div className="inventory-stats" role="status" aria-live="polite" aria-atomic="true">
        <p aria-label={`Showing ${filteredFoods.length} of ${foods.length} items`}>Showing {filteredFoods.length} of {foods.length} items</p>
      </div>

      {filteredFoods.length === 0 ? (
        <div className="no-items" role="status">
          <p>No foods found matching your criteria.</p>
        </div>
      ) : (
        <div className="inventory-grid" role="list" aria-label={`${filteredFoods.length} food items`}>
          {filteredFoods.map((food) => (
            <div 
              key={food.id} 
              className="inventory-card" 
              role="listitem"
              tabIndex={0}
              aria-label={`${food.foodName}, Price ${food.price} dollars, ${food.amount} units available, ${food.amount > 0 ? 'In stock' : 'Out of stock'}${food.allergies && food.allergies.length > 0 ? `, Contains ${food.allergies.join(', ')}` : ''}`}
            >
              <div className="food-header" aria-hidden="true">
                <h3>{food.foodName}</h3>
                <span className={`stock-badge ${food.amount > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {food.amount > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <div className="food-info" aria-hidden="true">
                <div className="info-row">
                  <span className="info-label">Price:</span>
                  <span className="info-value">${food.price}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Available:</span>
                  <span className="info-value">{food.amount} units</span>
                </div>
                {food.allergies && food.allergies.length > 0 && (
                  <div className="info-row">
                    <span className="info-label">Allergies:</span>
                    <span className="info-value allergies">
                      {food.allergies.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;