import React from 'react';
import './KeyProtocolScreen.css';
import { useNavigate } from 'react-router-dom';

const KeyProtocolScreen = () => {

    const navigate = useNavigate(); // <--- Usa el hook internamente

    const handleLogin = () => {
        // En lugar de llamar a una prop, navega directamente:
        navigate('/menu');
    };

    return (
        <div className="screen-container">
            <div className="logo-section">
                <img
                    src="/logo.png"
                    alt="Key Protocol Logo"
                    className="icon-image" // Agregamos una clase para estilizarlo
                />

                <h1 className="protocol-title">KEY</h1>
                <h2 className="protocol-subtitle">protocol</h2>
                <p className="description-text">
                    Registro de actividades descentralizado y offline
                </p>
            </div>

            <button className="technician-button" onClick={handleLogin}> {/* Llama a la función */}
                TECNICO
            </button>
        </div>
    );
};

export default KeyProtocolScreen;