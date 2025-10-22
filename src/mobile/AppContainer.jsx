import React, { useState } from 'react';

// Importa todos tus componentes de pantalla
import KeyProtocolScreen from './KeyProtocolScreen'; // Pantalla 1
import PhotoCaptureScreen from './PhotoCaptureScreen'; // Pantalla 2
import MenuScreen from './MenuScreen'; // Pantalla 3

// Define los nombres de las pantallas
const SCREENS = {
    LOGIN: 'login',
    MENU: 'menu',
    PHOTO_CAPTURE: 'photoCapture',
    IDENTIDADES: 'identidades',
    CLASES: 'clases',
};

const AppContainer = () => {
    // Estado para manejar la pantalla actual que se debe mostrar
    const [currentScreen, setCurrentScreen] = useState(SCREENS.LOGIN);

    // Función para cambiar de pantalla
    const navigateTo = (screenName) => {
        setCurrentScreen(screenName);
    };

    // Función para renderizar el componente basado en el estado
    const renderScreen = () => {
        switch (currentScreen) {
            case SCREENS.LOGIN:
                // Por ejemplo, el botón 'TECNICO' podría llevar al menú o a la captura de foto
                return <KeyProtocolScreen onLogin={() => navigateTo(SCREENS.MENU)} />;

            case SCREENS.PHOTO_CAPTURE:
                // En esta pantalla, 'CONTINUAR' podría llevar al menú, y 'ATRÁS' a login
                return (
                    <PhotoCaptureScreen
                        onContinue={() => navigateTo(SCREENS.MENU)}
                        onBack={() => navigateTo(SCREENS.LOGIN)}
                    />
                );

            case SCREENS.MENU:
                // Los botones 'IDENTIDADES' y 'CLASES' podrían ir a sus respectivas vistas
                return <MenuScreen onNavigate={navigateTo} />;

            case SCREENS.IDENTIDADES:
                return <div>Pantalla de Identidades <button onClick={() => navigateTo(SCREENS.MENU)}>Volver al Menú</button></div>;

            case SCREENS.CLASES:
                return <div>Pantalla de Clases <button onClick={() => navigateTo(SCREENS.MENU)}>Volver al Menú</button></div>;

            default:
                return <div>Error: Pantalla no encontrada.</div>;
        }
    };

    return (
        <div className="app-main-container">
            {renderScreen()}
        </div>
    );
};

export default AppContainer;