import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage, getCurrentUser, getAllFoods, getConversationHistory, clearConversationHistory } from '../services/api';

const Chatbot = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Initial greeting - only used once at the start
  const INITIAL_GREETING = "Hi! I'm your FoodSeer assistant. I'll ask you a few questions to find the perfect meal for you!";

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
<<<<<<< HEAD
  // Speech API state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [customQuestion, setCustomQuestion] = useState('');
=======
  
  // NEW: Rating state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
>>>>>>> origin/main

  // Load user and their chatbot state on mount
  useEffect(() => {
    const loadUserAndState = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
        
        // Load conversation history from database
        try {
          const history = await getConversationHistory(user.id);
          if (history && history.length > 0) {
            // Convert from ConversationDto to message format
            const messages = history.map(msg => ({
              role: msg.role,
              content: msg.messageContent
            }));
            setMessages(messages);
          }
        } catch (error) {
          console.error('Error loading conversation history:', error);
          // If no history, start with greeting
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
    // Start with the initial greeting if no saved state
    if (messages.length === 0 && stateLoaded) {
      setMessages([{
        role: 'assistant',
        content: INITIAL_GREETING
    // Start with a simple greeting only if no messages loaded from history
    if (messages.length === 0 && stateLoaded) {
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'m your FoodSeer AI assistant. Ask me anything about our menu or food recommendations!'
      }]);
      
      // Generate and add the first dynamic question
      const generateFirstQuestion = async () => {
        try {
          const userData = await getCurrentUser();
          const firstQuestion = await generateNextQuestion([{
            role: 'assistant',
            content: INITIAL_GREETING
          }], userData, { mood: '', hunger: '', preference: '' });
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: firstQuestion
          }]);
        } catch (error) {
          console.error('Error generating first question:', error);
          // Fallback
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "How are you feeling today? (e.g., tired, energetic, stressed, happy)"
          }]);
        }
      };
      
      generateFirstQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateLoaded]);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(prev => (prev ? prev + ' ' + transcript : transcript));
      // Auto-send on final result
      // Only auto-send when not loading
      if (!isLoading) {
        setTimeout(() => handleSendMessage(), 50);
      }
    };

    recog.onerror = (e) => {
      console.error('Speech recognition error', e);
      setIsRecording(false);
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recog;
    // cleanup
    return () => {
      try { recog.onresult = null; recog.onend = null; recog.onerror = null; } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateNextQuestion = async (conversationHistory, userData, currentResponses) => {
    // Build context about what we know and what we need
    const knownInfo = [];
    if (currentResponses.mood) knownInfo.push(`Mood: ${currentResponses.mood}`);
    if (currentResponses.hunger) knownInfo.push(`Hunger level: ${currentResponses.hunger}`);
    if (currentResponses.preference) knownInfo.push(`Food preference: ${currentResponses.preference}`);
    
    const neededInfo = [];
    if (!currentResponses.mood) neededInfo.push('their current mood/feeling');
    if (!currentResponses.hunger) neededInfo.push('their hunger level');
    if (!currentResponses.preference) neededInfo.push('what kind of food they want');
    
    const conversationContext = conversationHistory
      .slice(-4) // Last 4 messages for context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    const questionPrompt = `You are a friendly food recommendation assistant. Based on the conversation so far, ask ONE natural, conversational question to learn more about the user.

Conversation so far:
${conversationContext}

What we already know: ${knownInfo.length > 0 ? knownInfo.join(', ') : 'Nothing yet'}
What we still need to know: ${neededInfo.join(', ')}

User's profile: Budget preference: ${userData?.costPreference || 'moderate'}, Dietary restrictions: ${userData?.dietaryRestrictions || 'none'}

Generate a single, friendly, conversational question (1-2 sentences max) that feels natural and helps you understand ${neededInfo[0] || 'what they want'}. Be specific and engaging based on what they've already told you. Do NOT include any explanations or prefixes, just the question itself.`;
    
    try {
      const response = await sendChatMessage(questionPrompt);
      return response.message.trim();
    } catch (error) {
      console.error('Error generating question:', error);
      // Fallback questions based on what we need
      if (!currentResponses.mood) {
        return "How are you feeling today? (e.g., tired, energetic, stressed, happy)";
      } else if (!currentResponses.hunger) {
        return "How hungry are you right now? (e.g., very hungry, a bit peckish, just want a snack)";
      } else if (!currentResponses.preference) {
        return "What kind of food are you in the mood for? (e.g., something light, comfort food, healthy, sweet)";
      }
      return "Is there anything else you'd like to tell me about your food preferences?";
    }
  };

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
      // If in guided mode (steps 0-2), follow the template logic
      if (conversationStep < 3) {
        // Store user responses for the guided flow
        const responses = { ...userResponses };
        if (conversationStep === 0) responses.mood = inputMessage;
        if (conversationStep === 1) responses.hunger = inputMessage;
        if (conversationStep === 2) responses.preference = inputMessage;
        setUserResponses(responses);

        // Move to next step or finish guided flow
        const nextStep = conversationStep + 1;
        setConversationStep(nextStep);
        
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

        // Speak the AI response using SpeechSynthesis
        try {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(aiResponse.message);
            // Optionally set voice or rate here
            utterance.lang = 'en-US';
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }
        } catch (e) {
          console.error('TTS error', e);
        }

        // If we found a match, show order button
        if (matchedFood) {
        if (nextStep < 3) {
          // Ask next question
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: QUESTIONS[nextStep]
          }]);
        } else {
          // Guided flow complete - offer to get recommendation or continue chatting
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Great! I've learned about your mood, hunger level, and food preferences. Would you like me to recommend something now, or would you like to ask me anything else?"
          }]);
        }
      } else {
        // Generate next question based on conversation context
        const nextStep = conversationStep + 1;
        setConversationStep(nextStep);
        
        // Generate dynamic question based on conversation history
        try {
          const userData = await getCurrentUser();
          const conversationHistory = [...messages, userMessage];
          const nextQuestion = await generateNextQuestion(conversationHistory, userData, responses);
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: nextQuestion
          }]);
        } catch (error) {
          console.error('Error generating next question:', error);
          // Fallback to static questions
          let fallbackQuestion = "";
          if (nextStep === 1) {
            fallbackQuestion = "How hungry are you right now? (e.g., very hungry, a bit peckish, just want a snack)";
          } else if (nextStep === 2) {
            fallbackQuestion = "What kind of food are you in the mood for? (e.g., something light, comfort food, healthy, sweet)";
          }
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fallbackQuestion
          }]);
        // Free conversation mode - send raw user input to backend
        const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
        const aiResponse = await sendChatMessage({
          message: inputMessage,
          mode: 'auto', // Let backend decide based on content
          history: historyPayload,
          userId: currentUserId
        });

        const aiText = aiResponse.message || aiResponse;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiText
        }]);

        // If backend detected and matched a food, show recommendation card
        if (aiResponse.matchedFoodId) {
          try {
            const foods = await getAllFoods();
            const matchedFood = foods.find(f => f.id === aiResponse.matchedFoodId);
            if (matchedFood) {
              setRecommendedFood(matchedFood);
              setMessages(prev => [...prev, {
                role: 'system',
                content: 'recommendation-card',
                food: matchedFood
              }]);
            }
          } catch (e) {
            // ignore
          }
        }
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

  const handleSendCustomQuestion = async () => {
    if (!customQuestion.trim()) return;

    const userMessage = {
      role: 'user',
      content: customQuestion
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCustomQuestion('');

    try {
      // Filter out system messages (like recommendation-card) when building history
      const historyPayload = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      const aiResponse = await sendChatMessage({
        message: customQuestion,
        mode: 'freeform',
        history: historyPayload,
        userId: currentUserId
      });

      console.log('AI Response:', aiResponse);
      console.log('Matched Food ID:', aiResponse.matchedFoodId);

      const aiText = aiResponse.message || aiResponse;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiText
      }]);

      // If backend returned matchedFoodId, fetch the food and show recommendation card
      if (aiResponse.matchedFoodId) {
        try {
          const foods = await getAllFoods();
          const matchedFood = foods.find(f => f.id === aiResponse.matchedFoodId);
          if (matchedFood) {
            setRecommendedFood(matchedFood);
            setMessages(prev => [...prev, {
              role: 'system',
              content: 'recommendation-card',
              food: matchedFood
            }]);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error sending custom question:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error responding to your question.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderFood = () => {
    if (recommendedFood) {
      // Navigate to create order page with the recommended food
      // The CreateOrder page will add it to the cart automatically
      navigate('/create-order', { state: { addToCart: recommendedFood } });
    }
  };

  const handleStartOver = async () => {
    const newMessages = [{
      role: 'assistant',
      content: INITIAL_GREETING
    }];
    
    // Generate first question
    try {
      const userData = await getCurrentUser();
      const firstQuestion = await generateNextQuestion(newMessages, userData, { mood: '', hunger: '', preference: '' });
      newMessages.push({
        role: 'assistant',
        content: firstQuestion
      });
    } catch (error) {
      console.error('Error generating first question:', error);
      newMessages.push({
        role: 'assistant',
        content: "How are you feeling today? (e.g., tired, energetic, stressed, happy)"
      });
    }
    
    const newState = {
      messages: newMessages,
      conversationStep: 0,
    setIsLoading(true);

    // Clear server-side conversation history (if logged in)
    if (currentUserId) {
      try {
        await clearConversationHistory(currentUserId);
      } catch (err) {
        console.warn('Failed to clear server conversation history:', err);
      }
    }

    // Reset local storage and local state
    // Use a neutral, free-form greeting when restarting so the chat doesn't force the guided flow
    const neutralGreeting = "Hi! I'm your FoodSeer AI assistant. How can I help you today?";
    const newState = {
      messages: [{ role: 'assistant', content: neutralGreeting }],
      conversationStep: 3, // put into freeform mode by default after restart
      userResponses: { mood: '', hunger: '', preference: '' },
      recommendedFood: null
    };

    setMessages(newState.messages);
    setConversationStep(newState.conversationStep);
    setUserResponses(newState.userResponses);
    setRecommendedFood(newState.recommendedFood);
<<<<<<< HEAD

=======
    
    // Reset rating state
    setRating(0);
    setHoverRating(0);
    setHasRated(false);
    setRatingMessage('');
    
    // Clear user-specific chatbot state
>>>>>>> origin/main
    if (currentUserId) {
      try {
        localStorage.removeItem(`chatbotState_${currentUserId}`);
      } catch (e) {
        // ignore
      }
    }

    setIsLoading(false);
  };

  const handleGetAnotherSuggestion = async () => {
    const userMessage = {
      role: 'user',
      content: 'Can you suggest something else?'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setRecommendedFood(null);

    try {
      // Filter out system messages (like recommendation-card) when building history
      const historyPayload = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      const aiResponse = await sendChatMessage({
        message: 'Can you suggest something else? I would like a different recommendation.',
        mode: 'recommend',
        history: historyPayload,
        userId: currentUserId
      });

      console.log('AI Response:', aiResponse);
      console.log('Matched Food ID:', aiResponse.matchedFoodId);

      const aiText = aiResponse.message || aiResponse;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiText
      }]);

      // If backend returned matchedFoodId, fetch the food and show recommendation card
      if (aiResponse.matchedFoodId) {
        try {
          const foods = await getAllFoods();
          const matchedFood = foods.find(f => f.id === aiResponse.matchedFoodId);
          if (matchedFood) {
            setRecommendedFood(matchedFood);
            setMessages(prev => [...prev, {
              role: 'system',
              content: 'recommendation-card',
              food: matchedFood
            }]);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error getting another suggestion:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Let me try again!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    const recog = recognitionRef.current;
    if (!recog) {
      console.warn('SpeechRecognition not available in this browser.');
      return;
    }

    if (isRecording) {
      try { recog.stop(); } catch (e) {}
      setIsRecording(false);
    } else {
      try {
        recog.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting recognition', e);
      }
    }
  };

  const getStarColor = (starNumber) => {
    const displayRating = hoverRating || rating;
    return starNumber <= displayRating ? '#ffc107' : '#e4e5e9';
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h2>🤖 FoodSeer AI Assistant</h2>
          <p>Let me help you find the perfect meal for your day!</p>
        </div>
        <div>
          <button onClick={handleStartOver} className="btn-restart-chat" title="Restart conversation">
            🔄 Restart
          </button>
        </div>
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
                      Order Now
                    </button>
                    <button onClick={handleGetAnotherSuggestion} className="btn-secondary">
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

      <div className="chatbot-custom">
        <input
          id="customQuestion"
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCustomQuestion(); } }}
          placeholder="Ask me anything..."
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputMessage.trim() || conversationStep > 2}
          className="btn-send"
        >
          Send
        </button>
        <button
          onClick={handleToggleRecording}
          className={`btn-record ${isRecording ? 'recording' : ''}`}
          title={isRecording ? 'Stop recording' : 'Start speaking'}
          type="button"
        >
          {isRecording ? 'Stop' : '🎤'}
        </button>
          <button
            onClick={handleSendCustomQuestion}
            disabled={isLoading || !customQuestion.trim()}
            className="btn-send btn-custom"
          >
            Send
          </button>
      </div>

      <div className="chatbot-footer">
      </div>
    </div>
  );
};

export default Chatbot;
