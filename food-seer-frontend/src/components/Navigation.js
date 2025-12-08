import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/api';

const Navigation = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isStaff = user?.role === 'ROLE_STAFF' || isAdmin;
  const isStandardUser = user?.role === 'ROLE_CUSTOMER';

  const handleBrandClick = () => {
    if (isStaff) {
      navigate('/order-management');
    } else {
      navigate('/recommendations');
    }
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <div className="nav-brand" onClick={handleBrandClick}>
          🍽️ FoodSeer
        </div>

        <button 
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <div className="nav-links">
            {/* Customer-only menu items */}
            {isStandardUser && (
              <>
                <button
                  className={`nav-link ${location.pathname === '/recommendations' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/recommendations');
                    setMenuOpen(false);
                  }}
                >
                  🏠 Home
                </button>

                <button
                  className={`nav-link ${location.pathname === '/chatbot' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/chatbot');
                    setMenuOpen(false);
                  }}
                >
                  🤖 AI Assistant
                </button>

                <button
                  className={`nav-link ${location.pathname === '/quiz' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/quiz');
                    setMenuOpen(false);
                  }}
                >
                  📋 Quick Quiz
                </button>

                <button
                  className={`nav-link ${location.pathname === '/inventory' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/inventory');
                    setMenuOpen(false);
                  }}
                >
                  🏪 Browse Foods
                </button>

                <button
                  className={`nav-link ${location.pathname === '/create-order' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/create-order');
                    setMenuOpen(false);
                  }}
                >
                  🛒 Create Order
                </button>

                <button
                  className={`nav-link ${location.pathname === '/orders' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/orders');
                    setMenuOpen(false);
                  }}
                >
                  📦 My Orders
                </button>
              </>
            )}

            {/* Staff & Admin menu items */}
            {isStaff && (
              <>
                {isStandardUser && <div className="nav-divider"></div>}
                <button
                  className={`nav-link staff ${location.pathname === '/order-management' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/order-management');
                    setMenuOpen(false);
                  }}
                >
                  📦 Order Management
                </button>

                <button
                  className={`nav-link staff ${location.pathname === '/inventory-management' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/inventory-management');
                    setMenuOpen(false);
                  }}
                >
                  🏪 Inventory Management
                </button>
              </>
            )}

            {/* Admin-only menu items */}
            {isAdmin && (
              <>
                <button
                  className={`nav-link admin ${location.pathname === '/users' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/users');
                    setMenuOpen(false);
                  }}
                >
                  👥 User Management
                </button>
                <button
                  className={`nav-link admin ${location.pathname === '/admin/analytics' ? 'active' : ''}`}
                  onClick={() => {
                    navigate('/admin/analytics');
                    setMenuOpen(false);
                  }}
                >
                  📈 Analytics
                </button>
              </>
            )}
          </div>

          <div className="nav-user">
            {user && (
              <>
                <span className="user-info">
                  <span className="username">{user.username}</span>
                  <span className={`role-badge ${user.role.toLowerCase().replace('role_', '')}`}>
                    {user.role.replace('ROLE_', '')}
                  </span>
                </span>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

