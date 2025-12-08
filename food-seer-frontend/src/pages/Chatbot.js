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
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [conversationStep, setConversationStep] = useState(0);
  const [userResponses, setUserResponses] = useState({
    mood: '',
    hunger: '',
    preference: ''
  });
  const [recommendedFood, setRecommendedFood] = useState(null);
  const [stateLoaded, setStateLoaded] = useState(false);

  // Speech API state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [customQuestion, setCustomQuestion] = useState('');

  // Rating state
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

        // Load conversation history from database
        try {
          const history = await getConversationHistory(user.id);
          if (history && history.length > 0) {
            // Convert from ConversationDto to message format
            // Filter out system prompts containing menu lists
            const messages = history
              .filter(msg => {
                const content = msg.messageContent;
                // Remove messages that contain full menu lists (have many food items listed)
                const hasMenuList = content.includes('Available foods that match') ||
                  (content.includes('($') && content.split('($').length > 10); // Many prices = menu list
                return !hasMenuList;
              })
              .map(msg => ({
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

  const hasInitialized = useRef(false);

  useEffect(() => {
    // Start with a single initial message if no saved state
    if (messages.length === 0 && stateLoaded && !hasInitialized.current) {
      hasInitialized.current = true;

      // Use a static first question instead of calling backend
      // This prevents triggering food recommendations on startup
      setMessages([{
        role: 'assistant',
        content: 'How are you feeling today?'
      }]);
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
      // Speech recognition result -> state -> input value
      setCustomQuestion(prev => (prev ? prev + ' ' + transcript : transcript));
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
      try { recog.onresult = null; recog.onend = null; recog.onerror = null; } catch (e) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!customQuestion.trim()) return;

    const userMessage = {
      role: 'user',
      content: customQuestion
    };

    setMessages(prev => [...prev, userMessage]);
    setCustomQuestion('');
    setIsLoading(true);

    try {
      // Free conversation mode - send raw user input to backend
      // Include current user message in history for context
      const historyPayload = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await sendChatMessage({
        message: userMessage.content,
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



  const handleOrderFood = () => {
    if (recommendedFood) {
      // Navigate to create order page with the recommended food
      // The CreateOrder page will add it to the cart automatically
      navigate('/create-order', { state: { addToCart: recommendedFood } });
    }
  };

  const handleStartOver = async () => {
    // Start with just a simple greeting question (no backend call to avoid food recommendations)
    const newMessages = [{
      role: 'assistant',
      content: 'How are you feeling today?'
    }];

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
    const newState = {
      messages: newMessages,
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
      try {
        localStorage.removeItem(`chatbotState_${currentUserId}`);
      } catch (e) {
        // ignore
      }
    }

    // show confirmation toast
    showToast('Conversation cleared');

    setIsLoading(false);
  };

  const showToast = (msg, duration = 3000) => {
    try {
      setToastMessage(msg);
      window.setTimeout(() => setToastMessage(null), duration);
    } catch (e) {
      // ignore
    }
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
      try { recog.stop(); } catch (e) { }
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

  return (
    <div className="chatbot-container">
      <div className="chatbot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !customQuestion.trim()}
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
      </div>

      <div className="chatbot-footer">
      </div>
    </div>
  );
};

export default Chatbot;
