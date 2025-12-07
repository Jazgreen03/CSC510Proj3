import React from 'react';

const ChartModal = ({ children, onClose }) => {
    return (
        <div className="chart-modal-overlay" onClick={onClose}>
            <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="chart-modal-close">
                    <button className="cancel-button" onClick={onClose}>Close</button>
                </div>
                <div className="chart-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ChartModal;
