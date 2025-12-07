import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, getAllFoods } from '../services/api';

const Recommendations = () => {
  const [user, setUser] = useState(null);
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [mealRecommendations, setMealRecommendations] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [ollamaError, setOllamaError] = useState(null);
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

  const generateMealRecommendations = async () => {
    setLoadingMeals(true);
    setShowMeals(true);
    setOllamaError(null);

    try {
      // Prepare food data for AI
      const availableFoods = filteredFoods
        .filter(food => food.amount > 0)
        .slice(0, 20) // Limit to 20 foods to keep prompt concise
        .map(food => ({
          name: food.foodName,
          price: food.price,
          allergies: food.allergies || []
        }));

      if (availableFoods.length === 0) {
        setOllamaError('No foods available to create meals.');
        setLoadingMeals(false);
        return;
      }

      const budgetLimit = user.costPreference === 'budget' ? 10 : 
                         user.costPreference === 'moderate' ? 20 : 
                         user.costPreference === 'premium' ? 35 : 50;

      const prompt = `You are a meal planning assistant. Create 3 complete meal combinations from these foods.

Available Foods:
${availableFoods.map(f => `- ${f.name} ($${f.price})${f.allergies.length > 0 ? ` [Contains: ${f.allergies.join(', ')}]` : ''}`).join('\n')}

User Info:
- Budget per meal: $${budgetLimit}
- Avoid foods with: ${user.dietaryRestrictions || 'no restrictions'}

IMPORTANT: Use the EXACT food names from the list above in your "items" array.

Create exactly 3 meals. Each meal should have 2-4 food items that work well together.

Respond ONLY with valid JSON array format (no markdown, no extra text):
[
  {
    "name": "Meal name here",
    "items": ["EXACT_FOOD_NAME_1", "EXACT_FOOD_NAME_2"],
    "totalPrice": 8.5,
    "description": "Why this meal works"
  }
]`;

      console.log('Sending request to Ollama...');

      // Call Ollama API - using chat endpoint for better compatibility
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:1b',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Ollama response:', data);

      // Handle chat API response format
      let aiResponse = '';
      if (data.message && data.message.content) {
        aiResponse = data.message.content.trim();
      } else if (data.response) {
        aiResponse = data.response.trim();
      } else {
        throw new Error('No response from Ollama');
      }
      
      // Remove markdown code blocks if present
      aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Could not find JSON array in response:', aiResponse);
        throw new Error('Invalid response format from AI');
      }

      const meals = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(meals) || meals.length === 0) {
        throw new Error('AI did not return valid meal recommendations');
      }

      // Validate and clean up meal data
      const validMeals = meals.slice(0, 3).map(meal => ({
        name: meal.name || 'Unnamed Meal',
        // Clean up item names - remove any quantities in parentheses like "COFFEE (3)"
        items: Array.isArray(meal.items) 
          ? meal.items.map(item => item.replace(/\s*\([^)]*\)/g, '').trim())
          : [],
        totalPrice: typeof meal.totalPrice === 'number' ? meal.totalPrice : 0,
        description: meal.description || 'A delicious meal combination'
      }));

      setMealRecommendations(validMeals);
    } catch (error) {
      console.error('Error generating meal recommendations:', error);
      
      let errorMessage = 'Failed to generate meal recommendations. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Is Ollama running? Start it with: ollama serve';
      } else if (error.message.includes('model')) {
        errorMessage += 'Model not found. Pull it with: ollama pull gemma2:2b';
      } else {
        errorMessage += error.message;
      }
      
      setOllamaError(errorMessage);
      setMealRecommendations([]);
    } finally {
      setLoadingMeals(false);
    }
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
      <div className="recommendations-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading...</div>
      </div>
    );
  }

  return (
    <div className="recommendations-container" role="main" aria-label="Food recommendations page">
      <div className="user-info-card" role="region" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">Welcome, {user?.username}!</h2>
        <div className="preferences-summary" role="group" aria-label="Your preferences">
          <div className="preference-item">
            <span className="preference-label" aria-label="Budget preference">💰 Budget:</span>
            <span className="preference-value">
              {user?.costPreference || 'Not set'}
            </span>
          </div>
          <div className="preference-item">
            <span className="preference-label" aria-label="Dietary restrictions">🥗 Dietary Restrictions:</span>
            <span className="preference-value">
              {user?.dietaryRestrictions || 'None'}
            </span>
          </div>
        </div>
        <button 
          className="update-preferences-button"
          onClick={handleUpdatePreferences}
          aria-label="Update your preferences"
        >
          Update Preferences
        </button>
      </div>

      <section 
        className="meal-recommendations-section" 
        aria-labelledby="ai-meal-heading"
        role="region"
        style={{ 
          margin: '2rem 0', 
          padding: '1.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}
      >
        <div className="section-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 id="ai-meal-heading" style={{ margin: 0, marginBottom: '0.5rem' }}>
              <span aria-hidden="true">🤖</span> AI-Powered Full Meal Recommendations
            </h2>
            <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
              Powered by Ollama Gemma3:1b
            </p>
          </div>
          <button 
            className="generate-meals-button"
            onClick={generateMealRecommendations}
            disabled={loadingMeals || filteredFoods.length === 0}
            aria-label={loadingMeals ? 'Generating meal ideas' : 'Generate AI meal recommendations'}
            aria-disabled={loadingMeals || filteredFoods.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loadingMeals ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loadingMeals || filteredFoods.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            {loadingMeals ? '⏳ Generating...' : '✨ Generate Meal Ideas'}
          </button>
        </div>

        {showMeals && (
          <div className="meals-content" aria-live="polite">
            {loadingMeals ? (
              <div 
                className="loading-meals" 
                role="alert" 
                aria-live="polite"
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: '#6c757d'
                }}
              >
                <div className="spinner" aria-hidden="true" style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #007bff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}></div>
                <p>Creating personalized meal combinations with AI...</p>
              </div>
            ) : ollamaError ? (
              <div 
                className="error-message" 
                role="alert"
                aria-live="assertive"
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '6px',
                  border: '1px solid #f5c6cb'
                }}
              >
                <strong><span aria-hidden="true">⚠️</span> Error:</strong> {ollamaError}
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Setup Instructions:</strong>
                  <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li>Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a></li>
                    <li>Run: <code>ollama serve</code></li>
                    <li>Pull model: <code>ollama pull gemma3:1b</code></li>
                  </ol>
                </div>
              </div>
            ) : mealRecommendations.length > 0 ? (
              <ul 
                className="meals-grid" 
                role="list"
                aria-label={`${mealRecommendations.length} AI-generated meal recommendations`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1rem',
                  listStyle: 'none',
                  padding: 0
                }}
              >
                {mealRecommendations.map((meal, index) => (
                  <li 
                    key={index} 
                    className="meal-card" 
                    role="listitem"
                    aria-labelledby={`meal-name-${index}`}
                    aria-describedby={`meal-details-${index}`}
                    tabIndex={0}
                    style={{
                      backgroundColor: 'white',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="meal-header" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '2px solid #e9ecef'
                    }}>
                      <h3 id={`meal-name-${index}`} style={{ margin: 0, flex: 1 }}>
                        <span aria-label={`Meal number ${index + 1}`} style={{
                          display: 'inline-block',
                          width: '30px',
                          height: '30px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          borderRadius: '50%',
                          textAlign: 'center',
                          lineHeight: '30px',
                          marginRight: '0.5rem',
                          fontSize: '0.9rem'
                        }}>
                          {index + 1}
                        </span>
                        {meal.name}
                      </h3>
                      <div 
                        aria-label={`Total price: ${meal.totalPrice.toFixed(2)} dollars`}
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                          color: '#28a745'
                        }}
                      >
                        ${meal.totalPrice.toFixed(2)}
                      </div>
                    </div>
                    <div 
                      className="meal-items" 
                      id={`meal-details-${index}`}
                      style={{ marginBottom: '1rem' }}
                    >
                      <strong style={{ color: '#495057' }}>Includes:</strong>
                      <ul style={{
                        marginTop: '0.5rem',
                        paddingLeft: '1.5rem',
                        color: '#6c757d'
                      }}
                      aria-label={`This meal includes ${meal.items.length} items`}
                      >
                        {meal.items.map((item, i) => (
                          <li key={i} style={{ marginBottom: '0.25rem' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="meal-description" style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: '#495057' }}>Why this works:</strong>
                      <p style={{
                        marginTop: '0.5rem',
                        color: '#6c757d',
                        fontSize: '0.9rem',
                        lineHeight: '1.5'
                      }}>
                        {meal.description}
                      </p>
                    </div>
                    <button 
                      className="order-meal-button"
                      aria-label={`Order ${meal.name} for ${meal.totalPrice.toFixed(2)} dollars`}
                      onClick={() => {
                        // Case-insensitive matching for food items
                        const mealItems = meal.items
                          .map(itemName => {
                            const normalizedItemName = itemName.toLowerCase().trim();
                            return filteredFoods.find(f => 
                              f.foodName.toLowerCase().trim() === normalizedItemName
                            );
                          })
                          .filter(Boolean);
                        
                        console.log('Meal items requested:', meal.items);
                        console.log('Found items:', mealItems.map(f => f.foodName));
                        
                        if (mealItems.length === meal.items.length) {
                          navigate('/create-order', { 
                            state: { mealItems }
                          });
                        } else {
                          const missingItems = meal.items.filter((itemName, index) => 
                            !mealItems[index]
                          );
                          alert(`Some items in this meal are no longer available: ${missingItems.join(', ')}`);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                      <span aria-hidden="true">🛒</span> Order This Meal
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div 
                className="no-meals" 
                role="status"
                aria-live="polite"
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6c757d'
                }}
              >
                <p>No meal recommendations generated yet. Click the button above to get started!</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="recommendations-content" role="region" aria-labelledby="recommendations-heading">
        <h2 id="recommendations-heading">Your Personalized Recommendations</h2>
        {filteredFoods.length === 0 ? (
          <div className="no-recommendations" role="status">
            <p>No foods match your current preferences.</p>
            <p>Try adjusting your budget or dietary restrictions, or browse all available foods.</p>
          </div>
        ) : (
        <div className="recommendations-grid">
            {filteredFoods.map((food) => (
              <div 
                key={food.id} 
                className="recommendation-card"
                tabIndex={0}
                aria-label={`${food.foodName}, Price ${food.price} dollars, ${food.amount > 0 ? `${food.amount} units available` : 'Out of stock'}${food.allergies && food.allergies.length > 0 ? `, Contains ${food.allergies.join(', ')}` : ''}`}
              >
                <div className="recommendation-icon" aria-hidden="true">🍽️</div>
                <h3 aria-hidden="true">{food.foodName}</h3>
                <div className="food-details" aria-hidden="true">
                  <p><strong>Price:</strong> ${food.price}</p>
                  <p><strong>Available:</strong> {food.amount > 0 ? `${food.amount} units` : 'Out of stock'}</p>
                  {food.allergies && food.allergies.length > 0 && (
                    <p><strong>Allergies:</strong> {food.allergies.join(', ')}</p>
                  )}
          </div>
                <div className="recommendation-match" aria-hidden="true">
                  {food.amount > 0 ? '✓ Available' : '✗ Out of Stock'}
          </div>
        </div>
            ))}
          </div>
        )}
      </div>

      <div className="recommendations-footer" role="contentinfo">
        <p>Recommendations are based on your cost preference ({user?.costPreference || 'not set'}) and dietary restrictions ({user?.dietaryRestrictions || 'none'}).</p>
        <p aria-label={`Showing ${filteredFoods.length} of ${foods.length} available foods`}>Showing {filteredFoods.length} of {foods.length} available foods.</p>
      </div>
    </div>
  );
};

export default Recommendations;