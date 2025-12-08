import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllFoods, createFood, updateFood, deleteFood, getCurrentUser } from '../services/api';

const InventoryManagement = () => {
  // Comprehensive list of allergens
  const ALLERGEN_OPTIONS = [
    'MILK', 'DAIRY', 'LACTOSE', 'EGGS', 'FISH', 'SHELLFISH',
    'TREE-NUTS', 'PEANUTS', 'WHEAT', 'GLUTEN', 'SOY', 'SESAME',
    'CORN', 'SULFITES', 'MUSTARD', 'MEAT', 'BEEF', 'PORK',
    'POULTRY', 'GELATIN', 'CAFFEINE'
  ];

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    foodName: '',
    amount: 0,
    price: 0,
    allergies: []
  });
  const navigate = useNavigate();

  const fetchFoods = async () => {
    try {
      const user = await getCurrentUser();
      
      // Check if user has staff or admin role
      if (user.role !== 'ROLE_ADMIN' && user.role !== 'ROLE_STAFF') {
        alert('Access denied. Staff or Admin privileges required.');
        navigate('/');
        return;
      }

      const foodsData = await getAllFoods();
      setFoods(foodsData);
    } catch (error) {
      console.error('Error fetching foods:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      foodName: '',
      amount: 0,
      price: 0,
      allergies: []
    });
    setEditingFood(null);
    setShowAddForm(false);
  };

  const handleAllergyToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergen)
        ? prev.allergies.filter(a => a !== allergen)
        : [...prev.allergies, allergen]
    }));
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    
    if (!formData.foodName.trim()) {
      alert('Food name is required');
      return;
    }

    try {
      const foodData = {
        foodName: formData.foodName.toUpperCase(),
        amount: parseInt(formData.amount),
        price: parseInt(formData.price),
        allergies: formData.allergies // Already an array
      };

      await createFood(foodData);
      alert('Food added successfully!');
      resetForm();
      await fetchFoods();
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Failed to add food. Please try again.');
    }
  };

  const handleEditFood = (food) => {
    setEditingFood(food);
    setFormData({
      foodName: food.foodName,
      amount: food.amount,
      price: food.price,
      allergies: food.allergies || [] // Load as array
    });
    setShowAddForm(true);
  };

  const handleUpdateFood = async (e) => {
    e.preventDefault();

    if (!formData.foodName.trim()) {
      alert('Food name is required');
      return;
    }

    try {
      const foodData = {
        foodName: formData.foodName.toUpperCase(),
        amount: parseInt(formData.amount),
        price: parseInt(formData.price),
        allergies: formData.allergies // Already an array
      };

      await updateFood(foodData);
      alert('Food updated successfully!');
      resetForm();
      await fetchFoods();
    } catch (error) {
      console.error('Error updating food:', error);
      alert('Failed to update food. Please try again.');
    }
  };

  const handleDeleteFood = async (foodId, foodName) => {
    if (!window.confirm(`Are you sure you want to delete ${foodName}?`)) {
      return;
    }

    try {
      await deleteFood(foodId);
      alert('Food deleted successfully!');
      await fetchFoods();
    } catch (error) {
      console.error('Error deleting food:', error);
      // Show the actual error message from the backend
      alert(error.message || 'Failed to delete food. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/order-management');
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container" role="main" aria-busy="true">
        <div className="loading" role="status" aria-live="polite">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container" role="main" aria-labelledby="inventory-mgmt-heading">
      <div className="dashboard-header">
        <h1 id="inventory-mgmt-heading"><span aria-hidden="true">📦</span> Inventory Management</h1>
        <div className="header-actions" role="group" aria-label="Header actions">
          <button className="add-button" onClick={() => setShowAddForm(!showAddForm)} aria-label={showAddForm ? 'Cancel adding food' : 'Add new food item'} aria-expanded={showAddForm}>
            {showAddForm ? 'Cancel' : '+ Add Food'}
          </button>
          <button className="back-button" onClick={handleBack} aria-label="Go back to order management">
            Back
          </button>
        </div>
      </div>

      <div className="dashboard-stats" role="region" aria-label="Inventory statistics">
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total foods: ${foods.length}`}>
          <h3 id="total-foods-stat">Total Foods</h3>
          <p className="stat-number" aria-labelledby="total-foods-stat">{foods.length}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`In stock: ${foods.filter(f => f.amount > 0).length} items`}>
          <h3 id="in-stock-stat">In Stock</h3>
          <p className="stat-number" aria-labelledby="in-stock-stat">{foods.filter(f => f.amount > 0).length}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Out of stock: ${foods.filter(f => f.amount === 0).length} items`}>
          <h3 id="out-of-stock-stat">Out of Stock</h3>
          <p className="stat-number" aria-labelledby="out-of-stock-stat">{foods.filter(f => f.amount === 0).length}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="food-form-container" role="region" aria-labelledby="form-heading">
          <h2 id="form-heading">{editingFood ? 'Edit Food' : 'Add New Food'}</h2>
          <form onSubmit={editingFood ? handleUpdateFood : handleAddFood} className="food-form" aria-label={editingFood ? 'Edit food form' : 'Add new food form'}>
            <div className="form-group">
              <label htmlFor="foodName">Food Name *</label>
              <input
                type="text"
                id="foodName"
                name="foodName"
                value={formData.foodName}
                onChange={handleInputChange}
                required
                placeholder="Enter food name"
                aria-required="true"
                aria-label="Food name, required"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount">Amount *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="Stock amount"
                  aria-required="true"
                  aria-label="Stock amount, required"
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Price ($) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="Price"
                  aria-required="true"
                  aria-label="Price in dollars, required"
                />
              </div>
            </div>

            <div className="form-group">
              <label id="allergens-label">Allergens (select all that apply)</label>
              <div className="allergens-grid" role="group" aria-labelledby="allergens-label">
                {ALLERGEN_OPTIONS.map(allergen => (
                  <label key={allergen} className="allergen-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.allergies.includes(allergen)}
                      onChange={() => handleAllergyToggle(allergen)}
                      aria-label={`Select ${allergen} allergen`}
                    />
                    <span>{allergen}</span>
                  </label>
                ))}
              </div>
              {formData.allergies.length > 0 && (
                <div className="selected-allergies" role="status" aria-live="polite" aria-label={`Selected allergens: ${formData.allergies.join(', ')}`}>
                  Selected: {formData.allergies.join(', ')}
                </div>
              )}
            </div>

            <div className="form-actions" role="group" aria-label="Form actions">
              <button type="button" className="cancel-button" onClick={resetForm} aria-label="Cancel and close form">
                Cancel
              </button>
              <button type="submit" className="submit-button" aria-label={editingFood ? 'Update food item' : 'Add food item'}>
                {editingFood ? 'Update Food' : 'Add Food'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="foods-table-container" role="region" aria-labelledby="inventory-table-heading">
        <h2 id="inventory-table-heading">Food Inventory</h2>
        {foods.length === 0 ? (
          <p role="status">No foods in inventory. Add some to get started!</p>
        ) : (
          <table className="foods-table" role="table" aria-label="Food inventory table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Allergies</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {foods.map(food => (
                <tr key={food.id}>
                  <td>{food.id}</td>
                  <td>{food.foodName}</td>
                  <td aria-label={`${food.price} dollars`}>${food.price}</td>
                  <td>
                    <span className={food.amount > 0 ? 'stock-positive' : 'stock-zero'} aria-label={`${food.amount} units ${food.amount > 0 ? 'in stock' : 'out of stock'}`}>
                      {food.amount}
                    </span>
                  </td>
                  <td aria-label={food.allergies && food.allergies.length > 0 ? `Contains allergens: ${food.allergies.join(', ')}` : 'No allergens'}>{food.allergies && food.allergies.length > 0 ? food.allergies.join(', ') : 'None'}</td>
                  <td className="actions-cell">
                    <button
                      className="edit-button"
                      onClick={() => handleEditFood(food)}
                      aria-label={`Edit ${food.foodName}`}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteFood(food.id, food.foodName)}
                      aria-label={`Delete ${food.foodName}`}
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

export default InventoryManagement;