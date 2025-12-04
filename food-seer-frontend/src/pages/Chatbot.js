import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage, getCurrentUser, getAllFoods } from '../services/api';

const Chatbot = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const QUESTIONS = [
    "Hi! I'm your FoodSeer assistant. How are you feeling today? (e.g., tired, energetic, stressed, happy)",
    "How hungry are you right now? (e.g., very hungry, a bit peckish, just want a snack)",
    "What kind of food are you in the mood for? (e.g., something light, comfort food, healthy, sweet)"
  ];

  // Load state from localStorage or use defaults (user-specific)
  const loadState = (userId) => {
    if (!userId) return null;
    
    try {
      const saved = localStorage.getItem(`chatbotState_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          messages: parsed.messages || [],
          conversationStep: parsed.conversationStep || 0,
          userResponses: parsed.userResponses || { mood: '', hunger: '', preference: '' },
          recommendedFood: parsed.recommendedFood || null
        };
      }
    } catch (error) {
      console.error('Error loading chatbot state:', error);
    }
    return null;
  };

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const [userResponses, setUserResponses] = useState({
    mood: '',
    hunger: '',
    preference: ''
  });
  const [recommendedFood, setRecommendedFood] = useState(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  
  // NEW: Rating state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  // Load user and their chatbot state on mount
  useEffect(() => {
    const loadUserAndState = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
        
        // Load user-specific chatbot state
        const savedState = loadState(user.id);
        if (savedState) {
          setMessages(savedState.messages);
          setConversationStep(savedState.conversationStep);
          setUserResponses(savedState.userResponses);
          setRecommendedFood(savedState.recommendedFood);
        }
        setStateLoaded(true);
      } catch (error) {
        console.error('Error loading user:', error);
        navigate('/');
      }
    };

    loadUserAndState();
  }, [navigate]);

  // Save state to localStorage whenever it changes (user-specific)
  useEffect(() => {
    if (!currentUserId || !stateLoaded) return;
    
    const state = {
      messages,
      conversationStep,
      userResponses,
      recommendedFood
    };
    localStorage.setItem(`chatbotState_${currentUserId}`, JSON.stringify(state));
  }, [messages, conversationStep, userResponses, recommendedFood, currentUserId, stateLoaded]);

  useEffect(() => {
    // Start with the first question if no saved state
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: QUESTIONS[0]
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getPersonalizedPrompt = (mood, hunger, preference, userData, foods) => {
    const budget = userData?.costPreference || 'moderate';
    const dietaryRestrictions = userData?.dietaryRestrictions || '';
    
    // Convert dietary restrictions to array if it's a string
    const allergies = dietaryRestrictions 
      ? dietaryRestrictions.split(',').map(a => a.trim().toLowerCase()).filter(a => a.length > 0)
      : [];
    
    // Filter foods based on budget and allergies
    const availableFoods = foods.filter(food => {
      // Budget filtering (cumulative)
      if (budget === 'budget' && food.price > 10) return false;
      if (budget === 'moderate' && food.price > 20) return false;
      if (budget === 'premium' && food.price > 35) return false;
      
      // Allergy filtering - exclude foods that contain any of user's allergens
      if (allergies.length > 0 && food.allergies && food.allergies.length > 0) {
        const foodAllergies = food.allergies.map(a => a.toLowerCase());
        // If any user allergen matches any food allergen, exclude this food
        if (allergies.some(userAllergen => foodAllergies.includes(userAllergen))) {
          return false;
        }
      }
      
      return true;
    });

    const foodList = availableFoods.map(f => `${f.foodName} ($${f.price})`).join(', ');
    const allergiesText = allergies.length > 0 ? allergies.join(', ') : 'none';
    
    return `You are a helpful food recommendation assistant. Based on the following information, recommend ONE specific food item from the available menu.

User's mood: ${mood}
User's hunger level: ${hunger}
User's preference: ${preference}
User's budget: ${budget}
User's dietary restrictions: ${allergiesText}

Available foods that match their budget and dietary restrictions: ${foodList}

Please recommend exactly ONE food item from the available list that best matches their mood, hunger level, and preferences. 
Explain in 2-3 sentences why this food is perfect for them right now. Be conversational and friendly.
Format your response as: "I recommend [FOOD NAME]! [Explanation]"`;
  };

  // NEW: Handle star rating submission
  const handleStarClick = async (starNumber) => {
    if (hasRated || !recommendedFood) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8080/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recommendedFoodItem: recommendedFood.foodName,
          rating: starNumber,
          review: '',
          recommendationContext: 'AI Chatbot Recommendation from Ollama'
        })
      });

      if (response.ok) {
        setRating(starNumber);
        setHasRated(true);
        setRatingMessage(`✅ Thanks for rating ${recommendedFood.foodName}!`);
        
        setTimeout(() => setRatingMessage(''), 3000);
      } else {
        setRatingMessage('❌ Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setRatingMessage('❌ Error submitting rating');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Store user responses
      const responses = { ...userResponses };
      if (conversationStep === 0) responses.mood = inputMessage;
      if (conversationStep === 1) responses.hunger = inputMessage;
      if (conversationStep === 2) responses.preference = inputMessage;
      setUserResponses(responses);

      // If we've asked all questions, get food recommendation
      if (conversationStep === 2) {
        // Get user data and foods for personalized recommendation
        const userData = await getCurrentUser();
        const foods = await getAllFoods();
        
        const personalizedPrompt = getPersonalizedPrompt(
          responses.mood,
          responses.hunger,
          inputMessage, // current preference
          userData,
          foods
        );

        // Send to AI for recommendation
        const aiResponse = await sendChatMessage(personalizedPrompt);

        // Find the full food object
        const matchedFood = foods.find(f => 
          aiResponse.message.toLowerCase().includes(f.foodName.toLowerCase())
        );

        setRecommendedFood(matchedFood);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse.message
        }]);

        // If we found a match, show order button
        if (matchedFood) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'recommendation-card',
            food: matchedFood
          }]);
        }

      } else {
        // Move to next question
        const nextStep = conversationStep + 1;
        setConversationStep(nextStep);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: QUESTIONS[nextStep]
        }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure Ollama is running and try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOrderFood = () => {
    if (recommendedFood) {
      // Navigate to create order page with the recommended food
      // The CreateOrder page will add it to the cart automatically
      navigate('/create-order', { state: { addToCart: recommendedFood } });
    }
  };

  const handleStartOver = () => {
    const newState = {
      messages: [{
        role: 'assistant',
        content: QUESTIONS[0]
      }],
      conversationStep: 0,
      userResponses: { mood: '', hunger: '', preference: '' },
      recommendedFood: null
    };
    
    setMessages(newState.messages);
    setConversationStep(newState.conversationStep);
    setUserResponses(newState.userResponses);
    setRecommendedFood(newState.recommendedFood);
    
    // Reset rating state
    setRating(0);
    setHoverRating(0);
    setHasRated(false);
    setRatingMessage('');
    
    // Clear user-specific chatbot state
    if (currentUserId) {
      localStorage.setItem(`chatbotState_${currentUserId}`, JSON.stringify(newState));
    }
  };

  const getStarColor = (starNumber) => {
    const displayRating = hoverRating || rating;
    return starNumber <= displayRating ? '#ffc107' : '#e4e5e9';
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>🤖 FoodSeer AI Assistant</h2>
        <p>Let me help you find the perfect meal for your day!</p>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.role === 'system' && msg.content === 'recommendation-card' ? (
              <div className="recommendation-card">
                <h3>🎯 Your Personalized Recommendation</h3>
                <div className="food-card">
                  <h4>{msg.food.foodName}</h4>
                  <p className="food-price">${msg.food.price.toFixed(2)}</p>
                  <p className="food-allergies">
                    {msg.food.allergies && msg.food.allergies.length > 0 ? (
                      <>Contains: {msg.food.allergies.join(', ')}</>
                    ) : (
                      'No common allergens'
                    )}
                  </p>

                  {/* NEW: 5-Star Rating Section */}
                  <div className="rating-section">
                    <div className="rating-label">
                      {hasRated ? (
                        <span className="rating-thank-you">
                          ✓ Thanks for rating! ({rating}/5)
                        </span>
                      ) : (
                        <span>Rate This Recommendation:</span>
                      )}
                    </div>
                    
                    <div className="stars-container">
                      {[1, 2, 3, 4, 5].map((starNumber) => (
                        <span
                          key={starNumber}
                          className={`star ${hasRated ? 'rated' : 'clickable'}`}
                          onClick={() => handleStarClick(starNumber)}
                          onMouseEnter={() => !hasRated && setHoverRating(starNumber)}
                          onMouseLeave={() => !hasRated && setHoverRating(0)}
                          style={{
                            color: getStarColor(starNumber),
                            cursor: hasRated ? 'default' : 'pointer',
                            fontSize: '32px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    {ratingMessage && (
                      <div className={`rating-message ${ratingMessage.includes('✅') ? 'success' : 'error'}`}>
                        {ratingMessage}
                      </div>
                    )}
                  </div>

                  <div className="recommendation-actions">
                    <button onClick={handleOrderFood} className="btn-primary">
                      Order This Now!
                    </button>
                    <button onClick={handleStartOver} className="btn-secondary">
                      Get Another Suggestion
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  {msg.content}
                </div>
              </>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your answer here..."
          disabled={isLoading || conversationStep > 2}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputMessage.trim() || conversationStep > 2}
          className="btn-send"
        >
          Send
        </button>
      </div>

      <div className="chatbot-footer">
        <button onClick={() => navigate('/recommendations')} className="btn-link">
          Skip to Browse All Foods
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
