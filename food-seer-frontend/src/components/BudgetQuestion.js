import React, { useState } from 'react';

const BudgetQuestion = ({ budget, onUpdate, onNext, onPrevious, canGoNext }) => {
  const [selectedBudget, setSelectedBudget] = useState(budget);

  const budgetOptions = [
    { value: 'budget', label: 'Budget ($0-$10)', description: 'Most affordable options' },
    { value: 'moderate', label: 'Moderate ($0-$20)', description: 'Budget + mid-range options' },
    { value: 'premium', label: 'Premium ($0-$35)', description: 'All options including high-end' },
    { value: 'no-limit', label: 'No Limit', description: 'Show me everything' }
  ];

  const handleBudgetChange = (value) => {
    setSelectedBudget(value);
    onUpdate('budget', value);
  };

  const handleNext = () => {
    if (canGoNext) {
      onNext();
    }
  };

  return (
    <div className="quiz-container" aria-label="Budget selection question" tabIndex="0">
      <div className="icon-container" aria-label="Dollar icon" tabIndex="0">
        <div className="icon-dollar">$</div>
      </div>
      
      <h1 className="question-title" aria-label="Budget question heading" tabIndex="0">How much are you willing to spend per meal?</h1>
      
      <div className="options-container" aria-label="Budget options" tabIndex="0">
        {budgetOptions.map((option) => (
          <div
            key={option.value}
            className={`option-card ${selectedBudget === option.value ? 'selected' : ''}`}
            onClick={() => handleBudgetChange(option.value)}
            aria-label={`${option.label} - ${option.description}`}
            tabIndex="0"
          >
            <div className={`radio-button ${selectedBudget === option.value ? 'selected' : ''}`} aria-label="Radio button"></div>
            <div className="option-text" aria-label="Option details">
              <div className="option-label" aria-label="Budget option label" tabIndex="0">{option.label}</div>
              <div className="option-description" aria-label="Budget option description" tabIndex="0">{option.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="navigation" aria-label="Navigation buttons" tabIndex="0">
        <button className="previous-button" onClick={onPrevious} aria-label="Previous step button" tabIndex="0">
          <span className="previous-icon" aria-label="Previous arrow">←</span>
          Previous
        </button>
        <button 
          className="next-button" 
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next step button"
          tabIndex="0"
        >
          Next
          <span className="next-icon" aria-label="Next arrow">→</span>
        </button>
      </div>
    </div>
  );
};

export default BudgetQuestion;