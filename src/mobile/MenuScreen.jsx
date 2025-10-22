import React from 'react';
import './MenuScreen.css';
import { useNavigate } from 'react-router-dom';

// Componente para el botón reutilizable
const MenuButton = ({ iconPlaceholder, text, onClick }) => (
    <button className="menu-button" onClick={onClick}>
        <div className="icon-placeholder">{iconPlaceholder}</div>
        <span className="button-text">{text}</span>
    </button>
);

const MenuScreen = ({ onNavigate }) => {
    const navigate = useNavigate(); // <--- Usa el hook internamente

    const handleLogin = (event) => {
        // En lugar de llamar a una prop, navega directamente:
        navigate(event);
    };

    return (
        <div className="menu-screen-container">
            <MenuButton
                // Placeholder del ícono de Huella Dactilar
                iconPlaceholder="" // Usando un carácter de ícono Unicode si no se usa una librería como FontAwesome
                text="IDENTIDADES"
                onClick={() => handleLogin('/captura-foto')}
            />

            <MenuButton
                // Placeholder del ícono de Clase/Enseñanza
                iconPlaceholder="" // Usando un carácter de ícono Unicode si no se usa una librería como FontAwesome
                text="CLASES"
                onClick={() => handleLogin('clases')}
            />
        </div>
    );
};

export default MenuScreen;