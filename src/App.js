import React, { useState, useEffect } from 'react';
import Enrolamiento from './Enrolamiento';
import VerifyComponent from './VerifyComponent';
import './App.css';
import PeopleList from './PeopleList';
import PersonDisplay from './PersonDisplay';

// --- Función auxiliar para obtener peopleList desde Local Storage ---
const getInitialPeople = () => {
    const savedPeople = localStorage.getItem('peopleList');
    try {
        return savedPeople ? JSON.parse(savedPeople) : [];
    } catch (error) {
        console.error("Error al parsear 'peopleList' del Local Storage:", error);
        return [];
    }
};

// --- NotFound ---
const NotFound = ({ path }) => (
    <div className="card danger">
        <h1 className="notfound-title">404</h1>
        <p>Ruta no encontrada: <code className="mono">{path}</code></p>
        <p>Por favor, usa la barra de navegación para volver a una ruta válida.</p>
    </div>
);

// --- App (componente principal) ---
export default function App() {
    const [peopleList, setPeopleList] = useState(getInitialPeople);

    // Persistir en localStorage cuando cambie peopleList
    useEffect(() => {
        localStorage.setItem('peopleList', JSON.stringify(peopleList));
    }, [peopleList]);

    // Ruta simulada vía hash
    const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

    useEffect(() => {
        const handleHashChange = () => setCurrentPath(window.location.hash.slice(1) || '/');
        if (!window.location.hash) window.location.hash = '/';
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Render de rutas simple
    const RoutesRenderer = () => {
        const pathToCheck = currentPath;
        const matchVer = pathToCheck.match(/^\/ver\/([a-zA-Z0-9_-]+)$/);

        // 1. Lógica para la RUTA DINÁMICA
        if (matchVer) {
            // El parámetro capturado está en la posición [1] de la coincidencia
            const ipfsCid = matchVer[1];

            console.log("Parámetro CID extraído (RegExp):", ipfsCid);
            return <PersonDisplay ipfsCid={ipfsCid} />;
        }

        // 2. Lógica para las RUTAS ESTÁTICAS
        switch (pathToCheck) {
            case '/':
                return <Enrolamiento setPeopleList={setPeopleList} peopleList={peopleList} />;
            case '/validar':
                return <VerifyComponent />;
            case '/lista':
                return <PeopleList peopleList={peopleList} />;
            default:
                return <NotFound path={currentPath} />;
        }
    };

    // Link simple que cambia hash
    const Link = ({ to, children }) => (
        <a
            href={`#${to}`}
            role="link"
            className={`nav-link ${currentPath === to ? 'active' : ''}`}
            aria-current={currentPath === to ? 'page' : undefined}
        >
            {children}
        </a>
    );

    return (
        <div className="app-root">
            {/* estilos embebidos para facilitar la prueba sin dependencias */}


            <header className="topbar" role="banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>IDENTITY PoC</div>
                    <nav className="nav" role="navigation" aria-label="Main navigation">
                        <Link to="/">🏡 Inicio</Link>
                        <Link to="/validar">✍️ Validar</Link>
                        <Link to="/lista">📋 Ver Lista ({peopleList.length})</Link>
                        <Link to="/ver/QmWZQ3SfbYxzFM3KPiuyZjwVKk3tdQtehxWRy1zNwfGcEQ">Ver info de ipfs</Link>
                    </nav>
                </div>
            </header>

            <main>
                <RoutesRenderer />
            </main>
        </div>
    );
}
