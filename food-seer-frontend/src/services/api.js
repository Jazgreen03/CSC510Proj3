const API_BASE_URL = 'http://localhost:8080';

// Helper function to get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to create headers
const createHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Auth API calls
export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: createHeaders(false),
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    
    // Store token in localStorage
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('username', username);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (username, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: createHeaders(false),
      body: JSON.stringify({ username, email, password }),
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
};

// User API calls
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

export const updateUserPreferences = async (costPreference, dietaryRestrictions) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me/preferences`, {
      method: 'PUT',
      headers: createHeaders(true),
      body: JSON.stringify({ costPreference, dietaryRestrictions }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update preferences error:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Food API calls
export const getAllFoods = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch foods');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all foods error:', error);
    throw error;
  }
};

export const getFoodById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods/${id}`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch food');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get food by id error:', error);
    throw error;
  }
};

export const createFood = async (foodData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(foodData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create food');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create food error:', error);
    throw error;
  }
};

export const updateFood = async (foodData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods/updateFood`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(foodData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update food');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update food error:', error);
    throw error;
  }
};

export const deleteFood = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods/${id}`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 409) {
        // Conflict: food is part of unfulfilled orders
        throw new Error(errorText);
      }
      throw new Error('Failed to delete food');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Delete food error:', error);
    throw error;
  }
};

// Inventory API calls
export const getInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get inventory error:', error);
    throw error;
  }
};

export const updateInventory = async (inventoryData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(inventoryData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update inventory');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update inventory error:', error);
    throw error;
  }
};

// Order API calls
export const getAllOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all orders error:', error);
    throw error;
  }
};

export const getMyOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch my orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get my orders error:', error);
    throw error;
  }
};

export const getFulfilledOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/fulfilledOrders`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch fulfilled orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get fulfilled orders error:', error);
    throw error;
  }
};

export const getUnfulfilledOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/unfulfilledOrders`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch unfulfilled orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get unfulfilled orders error:', error);
    throw error;
  }
};

export const getOrderById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get order by id error:', error);
    throw error;
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(orderData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

export const fulfillOrder = async (orderId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/fulfillOrder`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify({ id: orderId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fulfill order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fulfill order error:', error);
    throw error;
  }
};

// Admin User Management API calls
export const getAllUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

export const getUserById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'GET',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get user by id error:', error);
    throw error;
  }
};

export const updateUserRole = async (id, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}/role`, {
      method: 'PUT',
      headers: createHeaders(true),
      body: JSON.stringify({ role }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user role');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update user role error:', error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    
    // Check if response has content before parsing JSON
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};

// Chat API calls
export const sendChatMessage = async (payload) => {
  try {
    // payload can be a string (message) or an object { message, mode, history, userId }
    const body = typeof payload === 'string' ? { message: payload } : payload;

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to send message to AI');
    }

    return await response.json();
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
};

// Conversation History API calls
export const getConversationHistory = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${userId}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversation history');
    }

    return await response.json();
  } catch (error) {
    console.error('Get conversation history error:', error);
    throw error;
  }
};

export const clearConversationHistory = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${userId}`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to clear conversation history');
    }

    return await response.text();
  } catch (error) {
    console.error('Clear conversation history error:', error);
    throw error;
  }
};
