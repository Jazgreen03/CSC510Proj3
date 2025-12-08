import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, getAllFoods } from '../services/api';

const Recommendations = () => {
  const [user, setUser] = useState(null);
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        const foodsData = await getAllFoods();
        setFoods(foodsData);
        
        // Filter foods based on user preferences
        filterFoodsByPreferences(foodsData, userData);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const filterFoodsByPreferences = (foodsData, userData) => {
    let filtered = [...foodsData];

    // Filter by budget/cost preference (cumulative ranges)
    if (userData.costPreference && userData.costPreference !== 'no-limit') {
      const budget = userData.costPreference.toLowerCase();
      
      if (budget === 'budget') {
        // Budget option: $0-$10 (most affordable)
        filtered = filtered.filter(food => food.price <= 10);
      } else if (budget === 'moderate') {
        // Moderate option: $0-$20 (includes budget + mid-range)
        filtered = filtered.filter(food => food.price <= 20);
      } else if (budget === 'premium') {
        // Premium option: $0-$35 (includes everything)
        filtered = filtered.filter(food => food.price <= 35);
      }
      // If no-limit or unrecognized value, show all foods (no filtering)
    }

    // Filter by dietary restrictions (allergies)
    if (userData.dietaryRestrictions) {
      const restrictionsInput = userData.dietaryRestrictions.toLowerCase();
      const userRestrictions = restrictionsInput.split(',').map(r => r.trim()).filter(r => r.length > 0);
      
      filtered = filtered.filter(food => {
        if (!food.allergies || food.allergies.length === 0) {
          return true; // No allergies means safe for all
        }
        
        // Check if any of the food's allergies match user's restrictions
        const foodAllergies = food.allergies.map(a => a.toLowerCase());
        
        // Return false if any user restriction matches any food allergen
        return !userRestrictions.some(restriction => 
          foodAllergies.some(allergy => allergy === restriction)
        );
      });
    }

    setFilteredFoods(filtered);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUpdatePreferences = () => {
    navigate('/preferences');
  };

  const handleBrowseInventory = () => {
    navigate('/inventory');
  };

  const handleViewOrders = () => {
    navigate('/orders');
  };

  if (loading) {
    return (
      <div className="recommendations-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="recommendations-container">
      <div className="user-info-card">
        <h2>Welcome, {user?.username}!</h2>
        <div className="preferences-summary">
          <div className="preference-item">
            <span className="preference-label">💰 Budget:</span>
            <span className="preference-value">
              {user?.costPreference || 'Not set'}
            </span>
          </div>
          <div className="preference-item">
            <span className="preference-label">🥗 Dietary Restrictions:</span>
            <span className="preference-value">
              {user?.dietaryRestrictions || 'None'}
            </span>
          </div>
        </div>
        <button 
          className="update-preferences-button"
          onClick={handleUpdatePreferences}
        >
          Update Preferences
        </button>
      </div>

      <div className="recommendations-content">
        <h2>Your Personalized Recommendations</h2>
        {filteredFoods.length === 0 ? (
          <div className="no-recommendations">
            <p>No foods match your current preferences.</p>
            <p>Try adjusting your budget or dietary restrictions, or browse all available foods.</p>
          </div>
        ) : (
        <div className="recommendations-grid">
            {filteredFoods.map((food) => (
              <div key={food.id} className="recommendation-card">
                <div className="recommendation-icon">🍽️</div>
                <h3>{food.foodName}</h3>
                <div className="food-details">
                  <p><strong>Price:</strong> ${food.price}</p>
                  <p><strong>Available:</strong> {food.amount > 0 ? `${food.amount} units` : 'Out of stock'}</p>
                  {food.allergies && food.allergies.length > 0 && (
                    <p><strong>Allergies:</strong> {food.allergies.join(', ')}</p>
                  )}
          </div>
                <div className="recommendation-match">
                  {food.amount > 0 ? '✓ Available' : '✗ Out of Stock'}
          </div>
        </div>
            ))}
          </div>
        )}
      </div>

      <div className="recommendations-footer">
        <p>Recommendations are based on your cost preference ({user?.costPreference || 'not set'}) and dietary restrictions ({user?.dietaryRestrictions || 'none'}).</p>
        <p>Showing {filteredFoods.length} of {foods.length} available foods.</p>
      </div>
    </div>
  );
};

export default Recommendations;

