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

// Admin stats API call
export const getAdminStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Get admin stats error:', error);
    throw error;
  }
};

// Analytics API calls
export const getAnalyticsOverview = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/overview`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics overview');
    }

    return await response.json();
  } catch (error) {
    console.error('Get analytics overview error:', error);
    throw error;
  }
};

export const getOrdersPerDay = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/orders-per-day?days=${days}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders per day');
    }

    return await response.json();
  } catch (error) {
    console.error('Get orders per day error:', error);
    throw error;
  }
};

export const getTopProducts = async (limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/top-products?limit=${limit}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch top products');
    }

    return await response.json();
  } catch (error) {
    console.error('Get top products error:', error);
    throw error;
  }
};

export const getPreferencesDistribution = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/preferences`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch preferences distribution');
    }

    return await response.json();
  } catch (error) {
    console.error('Get preferences distribution error:', error);
    throw error;
  }
};

export const getEngagement = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/engagement?days=${days}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch engagement metrics');
    }

    return await response.json();
  } catch (error) {
    console.error('Get engagement error:', error);
    throw error;
  }
};

// Snapshot and scheduling
export const getAnalyticsSnapshot = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics/snapshot?days=${days}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics snapshot');
    }

    return await response.json();
  } catch (error) {
    console.error('Get analytics snapshot error:', error);
    throw error;
  }
};

// Scheduling and send-email endpoints removed from backend; frontend scheduling helpers removed.

// Chat API calls
export const sendChatMessage = async (message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to send message to AI';
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = `Failed to send message: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data.message !== 'string') {
      throw new Error('Invalid response format from AI service');
    }
    
    return data;
  } catch (error) {
    console.error('Chat error:', error);
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check if the backend is running.');
    }
    throw error;
  }
};

