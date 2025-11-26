import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage, getCurrentUser, getAllFoods } from '../services/api';

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
  // Speech API state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

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
    // Start with the initial greeting if no saved state
    if (messages.length === 0 && stateLoaded) {
      setMessages([{
        role: 'assistant',
        content: INITIAL_GREETING
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
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'recommendation-card',
            food: matchedFood
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
      userResponses: { mood: '', hunger: '', preference: '' },
      recommendedFood: null
    };
    
    setMessages(newState.messages);
    setConversationStep(newState.conversationStep);
    setUserResponses(newState.userResponses);
    setRecommendedFood(newState.recommendedFood);
    
    // Clear user-specific chatbot state
    if (currentUserId) {
      localStorage.setItem(`chatbotState_${currentUserId}`, JSON.stringify(newState));
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
        <button onClick={() => navigate('/recommendations')} className="btn-link">
          Skip to Browse All Foods
        </button>
      </div>
    </div>
  );
};

export default Chatbot;

