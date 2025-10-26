import React from 'react';
import './KeyProtocolScreen.css';
import { useNavigate } from 'react-router-dom';

const KeyProtocolScreen = () => {

    const navigate = useNavigate();

    const handleLogin = () => {
        navigate('/menu');
    };

    return (
        <div className="screen-container">
            <div className="logo-section">
                <img
                    src="/logo.png"
                    alt="Key Protocol Logo"
                    className="icon-image"
                />

                <h1 className="protocol-title">KEY</h1>
                <h2 className="protocol-subtitle">protocol</h2>
                <p className="description-text">
                    Registro de actividades descentralizado y offline
                </p>
            </div>

            <button className="technician-button" onClick={handleLogin}>
                TECNICO
            </button>
        </div>
    );
};

export default KeyProtocolScreen;