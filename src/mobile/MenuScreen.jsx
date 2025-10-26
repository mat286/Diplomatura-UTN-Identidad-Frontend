import React from 'react';
import './MenuScreen.css';
import { useNavigate } from 'react-router-dom';

// Componente para el botón reutilizable
const MenuButton = ({ iconPlaceholder, text, onClick }) => (
    <button className="menu-button" onClick={onClick}>
        <div className="icon-placeholder">
            <img src={iconPlaceholder} />
        </div>

        <span className="button-text">{text}</span>
    </button>
);

const MenuScreen = () => {
    const navigate = useNavigate();

    const handleLogin = (event) => {
        navigate(event);
    };

    return (
        <div className="menu-screen-container">
            <MenuButton
                iconPlaceholder="./identidad.png"
                text="IDENTIDADES"
                onClick={() => handleLogin('/captura-foto')}
            />

            <MenuButton
                iconPlaceholder="./clases.png"
                text="CLASES"
                onClick={() => handleLogin('clases')}
            />
        </div>
    );
};

export default MenuScreen;