import React from 'react';
import './LoadingSpinner.css'; // Asegúrate de crear este archivo CSS

const LoadingSpinner = ({ message = "Cargando..." }) => {
    return (
        <div className="loading-container">
            {/* El div con la clase 'spinner' será el círculo giratorio */}
            <div className="spinner"></div>
            <p className="loading-message">{message}</p>
        </div>
    );
};

export default LoadingSpinner;