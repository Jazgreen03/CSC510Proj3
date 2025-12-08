import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, updateUserRole, deleteUser, getCurrentUser } from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.id);
      
      // Check if user is admin
      if (user.role !== 'ROLE_ADMIN') {
        alert('Access denied. Admin privileges required.');
        navigate('/recommendations');
        return;
      }

      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditRole = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleUpdateRole = async () => {
    if (!newRole) {
      alert('Please select a role');
      return;
    }

    if (editingUser.id === currentUserId && newRole !== 'ROLE_ADMIN') {
      alert('Warning: You are changing your own admin role. You will lose admin access!');
    }

    try {
      await updateUserRole(editingUser.id, newRole);
      alert('User role updated successfully!');
      setEditingUser(null);
      setNewRole('');
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (userId === currentUserId) {
      alert('You cannot delete your own account!');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }

    try {
      await deleteUser(userId);
      alert('User deleted successfully!');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'role-badge admin';
      case 'ROLE_STAFF':
        return 'role-badge staff';
      default:
        return 'role-badge customer';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Admin';
      case 'ROLE_STAFF':
        return 'Staff';
      case 'ROLE_CUSTOMER':
        return 'Customer';
      default:
        return role;
    }
  };

  const handleBack = () => {
    navigate('/recommendations');
  };

  if (loading) {
    return (
      <div className="user-management-container" aria-label="User management page" tabIndex="0">
        <div className="loading" aria-label="Loading users" tabIndex="0">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-management-container" aria-label="User management page" tabIndex="0">
      <div className="dashboard-header" aria-label="Dashboard header" tabIndex="0">
        <h1 aria-label="User management heading" tabIndex="0">👥 User Management</h1>
        <button className="back-button" onClick={handleBack} aria-label="Back to recommendations button" tabIndex="0">
          Back
        </button>
      </div>

      <div className="dashboard-stats" aria-label="User statistics dashboard" tabIndex="0">
        <div className="stat-card" aria-label="Total users statistic" tabIndex="0">
          <h3 aria-label="Total users label" tabIndex="0">Total Users</h3>
          <p className="stat-number" aria-label={`Total users: ${users.length}`} tabIndex="0">{users.length}</p>
        </div>
        <div className="stat-card" aria-label="Admins statistic" tabIndex="0">
          <h3 aria-label="Admins label" tabIndex="0">Admins</h3>
          <p className="stat-number" aria-label={`Admins: ${users.filter(u => u.role === 'ROLE_ADMIN').length}`} tabIndex="0">{users.filter(u => u.role === 'ROLE_ADMIN').length}</p>
        </div>
        <div className="stat-card" aria-label="Staff statistic" tabIndex="0">
          <h3 aria-label="Staff label" tabIndex="0">Staff</h3>
          <p className="stat-number" aria-label={`Staff: ${users.filter(u => u.role === 'ROLE_STAFF').length}`} tabIndex="0">{users.filter(u => u.role === 'ROLE_STAFF').length}</p>
        </div>
        <div className="stat-card" aria-label="Customers statistic" tabIndex="0">
          <h3 aria-label="Customers label" tabIndex="0">Customers</h3>
          <p className="stat-number" aria-label={`Customers: ${users.filter(u => u.role === 'ROLE_CUSTOMER').length}`} tabIndex="0">{users.filter(u => u.role === 'ROLE_CUSTOMER').length}</p>
        </div>
      </div>

      {editingUser && (
        <div className="edit-role-modal" aria-label="Edit user role modal" tabIndex="0">
          <div className="modal-content" aria-label="Modal content" tabIndex="0">
            <h2 aria-label="Edit user role heading" tabIndex="0">Edit User Role</h2>
            <p aria-label={`Username: ${editingUser.username}`} tabIndex="0"><strong>User:</strong> {editingUser.username}</p>
            <p aria-label={`Email: ${editingUser.email}`} tabIndex="0"><strong>Email:</strong> {editingUser.email}</p>
            <div className="form-group" aria-label="Role selection form group" tabIndex="0">
              <label htmlFor="role" aria-label="Select role label">Select Role:</label>
              <select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="role-select"
                aria-label="Role selection dropdown"
                tabIndex="0"
              >
                <option value="ROLE_CUSTOMER" aria-label="Customer role option">Customer</option>
                <option value="ROLE_STAFF" aria-label="Staff role option">Staff</option>
                <option value="ROLE_ADMIN" aria-label="Admin role option">Admin</option>
              </select>
            </div>
            <div className="modal-actions" aria-label="Modal action buttons" tabIndex="0">
              <button
                className="cancel-button"
                onClick={() => {
                  setEditingUser(null);
                  setNewRole('');
                }}
                aria-label="Cancel editing button"
                tabIndex="0"
              >
                Cancel
              </button>
              <button className="submit-button" onClick={handleUpdateRole} aria-label="Update role button" tabIndex="0">
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-table-container" aria-label="Users table container" tabIndex="0">
        <h2 aria-label="All users heading" tabIndex="0">All Users</h2>
        {users.length === 0 ? (
          <p aria-label="No users found message" tabIndex="0">No users found.</p>
        ) : (
          <table className="users-table" aria-label="Users table" tabIndex="0">
            <thead aria-label="Table header" tabIndex="0">
              <tr aria-label="Table header row" tabIndex="0">
                <th aria-label="ID column header" tabIndex="0">ID</th>
                <th aria-label="Username column header" tabIndex="0">Username</th>
                <th aria-label="Email column header" tabIndex="0">Email</th>
                <th aria-label="Role column header" tabIndex="0">Role</th>
                <th aria-label="Cost preference column header" tabIndex="0">Cost Preference</th>
                <th aria-label="Dietary restrictions column header" tabIndex="0">Dietary Restrictions</th>
                <th aria-label="Actions column header" tabIndex="0">Actions</th>
              </tr>
            </thead>
            <tbody aria-label="Table body" tabIndex="0">
              {users.map(user => (
                <tr key={user.id} className={user.id === currentUserId ? 'current-user' : ''} aria-label={`User row for ${user.username}`} tabIndex="0">
                  <td aria-label={`User ID: ${user.id}`} tabIndex="0">{user.id}</td>
                  <td aria-label={`Username: ${user.username}${user.id === currentUserId ? ' (You)' : ''}`} tabIndex="0">
                    {user.username}
                    {user.id === currentUserId && <span className="you-badge" aria-label="Current user badge"> (You)</span>}
                  </td>
                  <td aria-label={`Email: ${user.email}`} tabIndex="0">{user.email}</td>
                  <td aria-label={`Role: ${getRoleDisplayName(user.role)}`} tabIndex="0">
                    <span className={getRoleBadgeClass(user.role)} aria-label={`${getRoleDisplayName(user.role)} role badge`} tabIndex="0">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td aria-label={`Cost preference: ${user.costPreference || 'Not set'}`} tabIndex="0">{user.costPreference || '-'}</td>
                  <td aria-label={`Dietary restrictions: ${user.dietaryRestrictions || 'None'}`} tabIndex="0">{user.dietaryRestrictions || '-'}</td>
                  <td className="actions-cell" aria-label="User actions" tabIndex="0">
                    <button
                      className="edit-button"
                      onClick={() => handleEditRole(user)}
                      aria-label={`Change role for ${user.username}`}
                      tabIndex="0"
                    >
                      Change Role
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      disabled={user.id === currentUserId}
                      aria-label={`Delete user ${user.username}${user.id === currentUserId ? ' (disabled - cannot delete yourself)' : ''}`}
                      tabIndex="0"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;