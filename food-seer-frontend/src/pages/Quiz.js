import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAllFoods } from '../services/api';
import '../index.css';

const Quiz = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [availableFoods, setAvailableFoods] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [userAllergies, setUserAllergies] = useState([]);
  const [highlightAllergenFree, setHighlightAllergenFree] = useState(false);

  const questions = [
    {
      id: 'category',
      question: 'What type of food are you looking for?',
      options: [
        { value: 'beverage', label: '☕ Beverage' },
        { value: 'sweet', label: '🍰 Sweet/Dessert' },
        { value: 'savory', label: '🍔 Savory/Meal' },
        { value: 'snack', label: '🥨 Snack' }
      ]
    },
    {
      id: 'filling',
      question: 'How filling should it be?',
      options: [
        { value: 'light', label: 'Light/Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'heavy', label: 'Heavy/Full Meal' }
      ]
    },
    {
      id: 'temperature',
      question: 'What temperature do you prefer?',
      options: [
        { value: 'hot', label: '🔥 Hot' },
        { value: 'cold', label: '❄️ Cold' },
        { value: 'room', label: '🌡️ Room Temperature' }
      ]
    },
    {
      id: 'timeOfDay',
      question: 'When are you planning to eat this?',
      options: [
        { value: 'breakfast', label: '🌅 Breakfast' },
        { value: 'lunch', label: '☀️ Lunch' },
        { value: 'dinner', label: '🌙 Dinner' },
        { value: 'anytime', label: '⏰ Anytime/Snack' }
      ]
    },
    {
      id: 'flavor',
      question: 'What flavor profile appeals to you?',
      options: [
        { value: 'rich', label: 'Rich/Indulgent' },
        { value: 'fresh', label: 'Fresh/Light' },
        { value: 'savory', label: 'Savory/Umami' },
        { value: 'sweet', label: 'Sweet' }
      ]
    }
  ];

  // Load state from localStorage
  const loadState = (userId) => {
    if (!userId) return null;
    
    try {
      const saved = localStorage.getItem(`quizState_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          currentQuestion: parsed.currentQuestion || 0,
          answers: parsed.answers || {},
          recommendations: parsed.recommendations || [],
          isComplete: parsed.isComplete || false
        };
      }
    } catch (error) {
      console.error('Error loading quiz state:', error);
    }
    return null;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
        setUserPreferences(user.preferences);
        
        // Extract user's allergies from dietaryRestrictions
        let allergies = [];
        if (user.dietaryRestrictions) {
          // Handle comma-separated string format from API
          allergies = user.dietaryRestrictions
            .split(',')
            .map(a => a.trim())
            .filter(a => a.length > 0);
        } else if (user.preferences?.dietaryRestrictions) {
          try {
            allergies = typeof user.preferences.dietaryRestrictions === 'string'
              ? user.preferences.dietaryRestrictions.split(',').map(a => a.trim()).filter(a => a.length > 0)
              : user.preferences.dietaryRestrictions;
          } catch {
            allergies = [];
          }
        }
        setUserAllergies(allergies);
        console.log('Parsed user allergies:', allergies);
        
        const foods = await getAllFoods();
        // Filter by budget and allergies - CRITICAL: only safe foods
        const filtered = filterFoodsByPreferences(foods, user.preferences);
        setAvailableFoods(filtered);

        console.log(`Quiz: Loaded ${filtered.length} safe foods (filtered from ${foods.length} total foods)`);
        console.log('User allergies:', allergies);

        // Load user-specific quiz state
        const savedState = loadState(user.id);
        if (savedState) {
          setCurrentQuestion(savedState.currentQuestion);
          setAnswers(savedState.answers);
          setRecommendations(savedState.recommendations);
          setIsComplete(savedState.isComplete);
        }
        setStateLoaded(true);
      } catch (error) {
        console.error('Error loading user data:', error);
        navigate('/');
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!currentUserId || !stateLoaded) return;
    
    const state = {
      currentQuestion,
      answers,
      recommendations,
      isComplete
    };
    localStorage.setItem(`quizState_${currentUserId}`, JSON.stringify(state));
  }, [currentQuestion, answers, recommendations, isComplete, currentUserId, stateLoaded]);

  const filterFoodsByPreferences = (foods, preferences) => {
    if (!preferences) return foods;

    let filtered = foods.filter(food => food.amount > 0); // Only in-stock items

    // Filter by budget
    if (preferences.budget) {
      const budgetMap = {
        'budget': 10,
        'moderate': 20,
        'premium': 35
      };
      const maxPrice = budgetMap[preferences.budget.toLowerCase()] || Infinity;
      filtered = filtered.filter(food => food.price <= maxPrice);
    }

    // Filter by dietary restrictions (allergies) - check both locations
    let allergies = [];
    if (preferences.dietaryRestrictions) {
      // Handle comma-separated string format from API
      allergies = preferences.dietaryRestrictions
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
    }

    if (allergies.length > 0) {
      console.log('Filtering foods by allergies:', allergies);
      filtered = filtered.filter(food => {
        const foodAllergies = (food.allergies || []).map(a => a.toLowerCase());
        const userAllergyList = allergies.map(a => a.toLowerCase());
        const hasAllergen = userAllergyList.some(allergy => foodAllergies.includes(allergy));
        
        if (hasAllergen) {
          console.log(`Filtered out: ${food.foodName} - contains: ${food.allergies.join(', ')}`);
        }
        
        return !hasAllergen;
      });
      console.log(`After allergy filter: ${filtered.length} foods remaining`);
    }

    return filtered;
  };

  const handleAnswer = (value) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz complete, generate recommendations
      generateRecommendations(newAnswers);
    }
  };

  const generateRecommendations = (userAnswers) => {
    // SAFETY CHECK: Double-verify all foods are allergen-free
    const safeFoods = availableFoods.filter(food => {
      const foodAllergies = (food.allergies || []).map(a => a.toLowerCase());
      const userAllergyList = userAllergies.map(a => a.toLowerCase());
      const hasAllergen = userAllergyList.some(allergy => foodAllergies.includes(allergy));
      
      if (hasAllergen) {
        console.warn(`SAFETY: Filtered out ${food.foodName} - contains allergens: ${food.allergies.join(', ')}`);
      }
      
      return !hasAllergen;
    });

    console.log(`Scoring ${safeFoods.length} allergen-safe foods for recommendations`);

    let scored = safeFoods.map(food => {
      let score = 0;
      const foodName = food.foodName.toLowerCase();
      const foodAllergies = (food.allergies || []).map(a => a.toLowerCase());

      // Category matching
      if (userAnswers.category === 'beverage' && 
          (foodName.includes('coffee') || foodName.includes('juice') || foodName.includes('tea') || foodName.includes('smoothie'))) {
        score += 3;
      } else if (userAnswers.category === 'sweet' && 
          (foodName.includes('cake') || foodName.includes('yogurt') || foodName.includes('cream') || foodName.includes('cookie'))) {
        score += 3;
      } else if (userAnswers.category === 'savory' && 
          (foodName.includes('sandwich') || foodName.includes('steak') || foodName.includes('pasta') || 
           foodName.includes('pizza') || foodName.includes('sushi') || foodName.includes('burrito') || foodName.includes('soup'))) {
        score += 3;
      } else if (userAnswers.category === 'snack' && 
          (foodName.includes('chips') || foodName.includes('pretzel') || foodName.includes('trail mix') || foodName.includes('bar'))) {
        score += 3;
      }

      // Filling level matching
      if (userAnswers.filling === 'light' && 
          (foodName.includes('salad') || foodName.includes('yogurt') || foodName.includes('juice') || foodName.includes('fruit'))) {
        score += 2;
      } else if (userAnswers.filling === 'heavy' && 
          (foodName.includes('steak') || foodName.includes('pizza') || foodName.includes('burrito') || 
           foodName.includes('pasta') || foodName.includes('burger'))) {
        score += 2;
      } else if (userAnswers.filling === 'medium') {
        score += 1; // Most foods are medium
      }

      // Temperature matching
      if (userAnswers.temperature === 'hot' && 
          (foodName.includes('coffee') || foodName.includes('soup') || foodName.includes('tea') || 
           foodName.includes('steak') || foodName.includes('pizza'))) {
        score += 2;
      } else if (userAnswers.temperature === 'cold' && 
          (foodName.includes('cream') || foodName.includes('juice') || foodName.includes('salad') || 
           foodName.includes('sushi') || foodName.includes('smoothie'))) {
        score += 2;
      } else if (userAnswers.temperature === 'room' && 
          (foodName.includes('sandwich') || foodName.includes('chips') || foodName.includes('pretzel'))) {
        score += 2;
      }

      // Time of day matching
      if (userAnswers.timeOfDay === 'breakfast' && 
          (foodName.includes('coffee') || foodName.includes('yogurt') || foodName.includes('muffin') || foodName.includes('bagel'))) {
        score += 2;
      } else if (userAnswers.timeOfDay === 'lunch' && 
          (foodName.includes('sandwich') || foodName.includes('salad') || foodName.includes('soup'))) {
        score += 2;
      } else if (userAnswers.timeOfDay === 'dinner' && 
          (foodName.includes('steak') || foodName.includes('pasta') || foodName.includes('pizza') || foodName.includes('sushi'))) {
        score += 2;
      } else if (userAnswers.timeOfDay === 'anytime') {
        score += 1; // Snacks work anytime
      }

      // Flavor profile matching
      if (userAnswers.flavor === 'rich' && 
          (foodName.includes('cake') || foodName.includes('steak') || foodName.includes('cream') || 
           foodName.includes('chocolate') || foodName.includes('cheese'))) {
        score += 2;
      } else if (userAnswers.flavor === 'fresh' && 
          (foodName.includes('salad') || foodName.includes('fruit') || foodName.includes('juice') || 
           foodName.includes('smoothie') || foodName.includes('sushi'))) {
        score += 2;
      } else if (userAnswers.flavor === 'savory' && 
          (foodName.includes('steak') || foodName.includes('pizza') || foodName.includes('soup') || 
           foodName.includes('chips'))) {
        score += 2;
      } else if (userAnswers.flavor === 'sweet' && 
          (foodName.includes('cake') || foodName.includes('yogurt') || foodName.includes('cookie'))) {
        score += 2;
      }

      return { ...food, score };
    });

    // Sort by score and get top 5
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5).filter(food => food.score > 0);

    // FINAL SAFETY VERIFICATION
    const verifiedSafe = top5.filter(food => {
      const foodAllergies = (food.allergies || []).map(a => a.toLowerCase());
      const userAllergyList = userAllergies.map(a => a.toLowerCase());
      return !userAllergyList.some(allergy => foodAllergies.includes(allergy));
    });

    if (verifiedSafe.length === 0) {
      // If no good matches, show any available safe foods
      console.log('No matching foods found, showing first 5 safe foods');
      setRecommendations(safeFoods.slice(0, 5));
    } else {
      console.log(`Recommending ${verifiedSafe.length} verified allergen-safe foods`);
      setRecommendations(verifiedSafe);
    }

    setIsComplete(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setRecommendations([]);
    setIsComplete(false);
    
    // Clear user-specific quiz state from localStorage
    if (currentUserId) {
      localStorage.removeItem(`quizState_${currentUserId}`);
    }
  };

  const handleGoBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleOrderFood = (food) => {
    navigate('/create-order', { state: { addToCart: food } });
  };

  if (isComplete) {
    return (
      <div className="quiz-container" role="main" aria-label="Quiz results page">
      <div className="quiz-header" role="region" aria-labelledby="results-heading">
        <h2 id="results-heading"><span aria-hidden="true">📋</span> Your Personalized Recommendations</h2>
        <p>Based on your preferences and quiz answers</p>
        {userAllergies.length > 0 && (
          <div className="allergen-safety-notice" role="status" aria-label={`All recommendations exclude ${userAllergies.join(', ')}`}>
            <span aria-hidden="true">✅</span> <strong>Allergen-Safe:</strong> All recommendations exclude {userAllergies.join(', ')}
          </div>
        )}
        <button 
          className={`btn-secondary ${highlightAllergenFree ? 'active' : ''}`}
          onClick={() => setHighlightAllergenFree(!highlightAllergenFree)}
          style={{ marginTop: '10px' }}
          aria-pressed={highlightAllergenFree}
          aria-label={highlightAllergenFree ? 'Currently highlighting foods safe for you, click to turn off' : 'Highlight foods that are safe for you'}
        >
          {highlightAllergenFree ? '✓ Highlighting Safe Foods' : '🔍 Highlight Foods Safe For You'}
        </button>
      </div>

        {recommendations.length > 0 ? (
          <div className="quiz-recommendations" role="region" aria-label={`${recommendations.length} food recommendations`}>
            {recommendations.map((food, index) => {
              // Check if food contains any of the user's specific allergies
              const foodAllergies = (food.allergies || []).map(a => a.toLowerCase());
              const userAllergyList = userAllergies.map(a => a.toLowerCase());
              const containsUserAllergy = userAllergyList.some(allergy => foodAllergies.includes(allergy));
              const isAllergenFree = !containsUserAllergy; // Safe from user's allergies
              const shouldHighlight = highlightAllergenFree && isAllergenFree;
              
              return (
              <div 
                key={food.id} 
                className={`recommendation-card ${shouldHighlight ? 'allergen-free-highlight' : ''}`}
                style={shouldHighlight ? {
                  border: '3px solid #10b981',
                  backgroundColor: '#f0fdf4',
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                } : {}}
                role="article"
                tabIndex={0}
                aria-label={`Recommendation ${index + 1}, ${food.foodName}, Price ${food.price.toFixed(2)} dollars, ${food.amount} units in stock${food.allergies && food.allergies.length > 0 ? `, Contains ${food.allergies.join(', ')}` : ''}${isAllergenFree ? ', Safe for you' : ''}`}
              >
                <div className="recommendation-rank" aria-label={`Ranked number ${index + 1}`}>#{index + 1}</div>
                {isAllergenFree && highlightAllergenFree && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  aria-label="This food is safe for your dietary restrictions"
                  >
                    <span aria-hidden="true">✓</span> SAFE FOR YOU
                  </div>
                )}
                <h3 aria-hidden="true">{food.foodName}</h3>
                <p className="recommendation-price" aria-hidden="true">${food.price.toFixed(2)}</p>
                <p className="recommendation-stock" aria-hidden="true">In Stock: {food.amount}</p>
                {food.allergies && food.allergies.length > 0 && (
                  <div className="recommendation-allergies" aria-hidden="true">
                    <small>Contains: {food.allergies.join(', ')}</small>
                  </div>
                )}
                <button 
                  className="btn-primary" 
                  onClick={() => handleOrderFood(food)}
                  aria-label={`Add ${food.foodName} to cart`}
                >
                  Add to Cart
                </button>
              </div>
            )})}
          </div>
        ) : (
          <div className="no-recommendations" role="status" aria-live="polite">
            <p><span aria-hidden="true">😔</span> No foods match your quiz answers. Try adjusting your preferences!</p>
          </div>
        )}

        <div className="quiz-actions" role="navigation" aria-label="Quiz navigation">
          <button className="btn-secondary" onClick={handleRestart} aria-label="Restart quiz and take it again">
            <span aria-hidden="true">🔄</span> Take Quiz Again
          </button>
          <button className="btn-link" onClick={() => navigate('/browse-foods')} aria-label="Browse all available foods">
            Browse All Foods
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container" role="main" aria-label="Food recommendation quiz">
      <div className="quiz-header" role="region" aria-labelledby="quiz-title">
        <h2 id="quiz-title"><span aria-hidden="true">📋</span> Food Recommendation Quiz</h2>
        <p>Answer {questions.length} quick questions to find your perfect meal!</p>
        <div className="quiz-progress" role="status" aria-label={`Question ${currentQuestion + 1} of ${questions.length}`}>
          Question {currentQuestion + 1} of {questions.length}
          <div className="progress-bar" role="progressbar" aria-valuenow={currentQuestion + 1} aria-valuemin="1" aria-valuemax={questions.length} aria-label={`Quiz progress: ${Math.round(((currentQuestion + 1) / questions.length) * 100)} percent complete`}>
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="quiz-question" role="region" aria-labelledby={`question-${currentQuestion}`}>
        <h3 id={`question-${currentQuestion}`}>{questions[currentQuestion].question}</h3>
        <div className="quiz-options" role="group" aria-label="Answer options">
          {questions[currentQuestion].options.map((option) => (
            <button
              key={option.value}
              className="quiz-option-btn"
              onClick={() => handleAnswer(option.value)}
              aria-label={`Select ${option.label.replace(/[🔥❄️🌡️☕🍰🍔🥨🌅☀️🌙⏰]/g, '').trim()}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {currentQuestion > 0 && (
        <div className="quiz-actions" role="navigation" aria-label="Quiz navigation">
          <button className="btn-secondary" onClick={handleGoBack} aria-label="Go back to previous question">
            ← Back
          </button>
        </div>
      )}

      <div className="quiz-footer" role="contentinfo" aria-label="User preferences and available options">
        <div className="quiz-info-box">
          <div className="quiz-info-item" aria-label={`Budget preference: ${userPreferences?.budget ? `${userPreferences.budget}, 0 to ${userPreferences.budget === 'budget' ? '10' : userPreferences.budget === 'moderate' ? '20' : '35'} dollars` : 'No Limit'}`}>
            <span aria-hidden="true">💰</span> <strong>Budget:</strong> {userPreferences?.budget 
              ? `${userPreferences.budget} ($0-${userPreferences.budget === 'budget' ? '10' : userPreferences.budget === 'moderate' ? '20' : '35'})`
              : 'No Limit'}
          </div>
          {userAllergies.length > 0 && (
            <div className="quiz-info-item allergen-info" aria-label={`Safe from allergies: ${userAllergies.join(', ')}`}>
              <span aria-hidden="true">✅</span> <strong>Safe from:</strong> {userAllergies.join(', ')}
            </div>
          )}
          {availableFoods.length > 0 && (
            <div className="quiz-info-item" aria-label={`${availableFoods.length} safe foods available in stock`}>
              <span aria-hidden="true">🍽️</span> <strong>Available options:</strong> {availableFoods.length} safe foods in stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;