
// Importa tus componentes de pantalla
// AppRouter.jsx (Simplificado)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// ... imports de pantallas ...
import KeyProtocolScreen from './KeyProtocolScreen';
import PhotoCaptureScreen from './PhotoCaptureScreen';
import MenuScreen from './MenuScreen';
import Enrolamiento from './Enrolamiento';
import PeopleList from '../PeopleList';
/* import IdentidadesScreen from './IdentidadesScreen'; */
/* import ClasesScreen from './ClasesScreen'; */

const AppRouter = () => {
    return (
        <BrowserRouter>
            <div className="app-main-container">
                <Routes>
                    <Route path="/" element={<KeyProtocolScreen />} />
                    <Route path="/menu" element={<MenuScreen />} />
                    {/* <Route path="/captura-foto" element={<PhotoCaptureScreen />} /> */}
                    <Route path="/captura-foto" element={<Enrolamiento />} />
                    {/* <Route path="/identidades" element={<IdentidadesScreen />} /> */}
                    {/* <Route path="/clases" element={<ClasesScreen />} /> */}
                    <Route path="*" element={<div>404 | Página no encontrada</div>} />
                    <Route path="/lista" element={<PeopleList />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default AppRouter;