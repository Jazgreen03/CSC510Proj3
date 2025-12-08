import React, { useState, useEffect } from 'react';

const DietaryRestrictions = ({ restrictions, onUpdate, onNext, onPrevious, canGoNext }) => {
  const [selectedRestrictions, setSelectedRestrictions] = useState(restrictions);

  // Sync state with prop when it changes (e.g., when user returns to update preferences)
  useEffect(() => {
    console.log('🔄 DietaryRestrictions received restrictions prop:', restrictions);
    setSelectedRestrictions(restrictions);
  }, [restrictions]);

  // Log initial state
  useEffect(() => {
    console.log('🎯 DietaryRestrictions component mounted with:', {
      restrictions,
      selectedRestrictions
    });
  }, []);

  // Comprehensive allergen options matching backend
  const allergenOptions = [
    { value: 'MILK', label: 'Milk/Dairy' },
    { value: 'LACTOSE', label: 'Lactose' },
    { value: 'EGGS', label: 'Eggs' },
    { value: 'FISH', label: 'Fish' },
    { value: 'SHELLFISH', label: 'Shellfish' },
    { value: 'TREE-NUTS', label: 'Tree Nuts' },
    { value: 'PEANUTS', label: 'Peanuts' },
    { value: 'WHEAT', label: 'Wheat' },
    { value: 'GLUTEN', label: 'Gluten' },
    { value: 'SOY', label: 'Soy' },
    { value: 'SESAME', label: 'Sesame' },
    { value: 'CORN', label: 'Corn' },
    { value: 'SULFITES', label: 'Sulfites' },
    { value: 'MUSTARD', label: 'Mustard' },
    { value: 'MEAT', label: 'Meat (All)' },
    { value: 'BEEF', label: 'Beef' },
    { value: 'PORK', label: 'Pork' },
    { value: 'POULTRY', label: 'Poultry' },
    { value: 'GELATIN', label: 'Gelatin' },
    { value: 'CAFFEINE', label: 'Caffeine' }
  ];

  const handleRestrictionChange = (value) => {
    let newRestrictions;
    if (selectedRestrictions.includes(value)) {
      console.log(`➖ Removing restriction: ${value}`);
      newRestrictions = selectedRestrictions.filter(r => r !== value);
    } else {
      console.log(`➕ Adding restriction: ${value}`);
      newRestrictions = [...selectedRestrictions, value];
    }
    
    console.log('📝 Updated dietary restrictions:', newRestrictions);
    setSelectedRestrictions(newRestrictions);
    onUpdate('dietaryRestrictions', newRestrictions);
  };

  const handleNext = () => {
    if (canGoNext) {
      onNext();
    }
  };

  return (
    <div className="quiz-container allergen-selection" aria-label="Dietary restrictions selection" tabIndex="0">
      <div className="icon-container" aria-label="Carrot icon" tabIndex="0">
        <div className="icon-carrot">🥕</div>
      </div>
      
      <h1 className="question-title" aria-label="Dietary restrictions question heading" tabIndex="0">Do you have any allergies or dietary restrictions?</h1>
      <p className="question-subtitle" aria-label="Instructions for dietary restrictions" tabIndex="0">Select all that apply, or skip to see all options</p>
      
      <div className="allergens-scroll-container" aria-label="Scrollable allergen options container" tabIndex="0">
        <div className="allergens-selection-grid" aria-label="Allergen selection grid" tabIndex="0">
          {allergenOptions.map((option) => (
            <label
              key={option.value}
              className={`allergen-option ${selectedRestrictions.includes(option.value) ? 'selected' : ''}`}
              aria-label={`${option.label} dietary restriction option`}
              tabIndex="0"
            >
              <input
                type="checkbox"
                checked={selectedRestrictions.includes(option.value)}
                onChange={() => handleRestrictionChange(option.value)}
                aria-label={`Checkbox for ${option.label}`}
              />
              <span aria-label={`${option.label} label`}>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {selectedRestrictions.length > 0 && (
        <div className="selected-restrictions-summary" aria-label="Selected dietary restrictions summary" tabIndex="0">
          <strong>Selected ({selectedRestrictions.length}):</strong> {selectedRestrictions.join(', ')}
        </div>
      )}
      
      <div className="navigation" aria-label="Navigation buttons" tabIndex="0">
        <button className="previous-button" onClick={onPrevious} aria-label="Previous step button" tabIndex="0">
          <span className="previous-icon" aria-label="Previous arrow">←</span>
          Previous
        </button>
        <button 
          className="next-button" 
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Finish and save preferences button"
          tabIndex="0"
        >
          Finish
          <span className="next-icon" aria-label="Checkmark icon">✓</span>
        </button>
      </div>
    </div>
  );
};

export default DietaryRestrictions;