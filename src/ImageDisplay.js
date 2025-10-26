import React, { useState, useEffect } from 'react';
import { getImageObjectURL } from './funciones/offlineStore';

// Asume que este componente recibe la clave de la imagen
function ImageDisplay({ offlineImageKey, tamaño = { width: "100%", height: "auto", radius: false } }) {
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
        let currentObjectURL = null;

        // 1. Cargar la imagen y crear la URL
        const loadAndDisplayImage = async () => {
            const url = await getImageObjectURL(offlineImageKey);
            if (url) {
                currentObjectURL = url; 
                setImageUrl(url);
            }
        };

        if (offlineImageKey) {
            loadAndDisplayImage();
        } else {
            setImageUrl(null);
        }

        // 2. FUNCIÓN DE LIMPIEZA: Se ejecuta al desmontar o antes del siguiente render
        return () => {
            if (currentObjectURL) {
                console.log("Revocando URL de Objeto:", currentObjectURL);
                URL.revokeObjectURL(currentObjectURL);
            }
        };
    }, [offlineImageKey]);

    if (!imageUrl) {
        return <div>Cargando imagen de muestra...</div>;
    }

    return (
        <div>
            <img
                src={imageUrl}
                alt="Muestra de Enrolamiento Offline"
                style={{ width: tamaño.width, maxWidth: '400px', height: tamaño.height, borderRadius: tamaño.radius ? '50%' : '8px' }}
            />
        </div>
    );
}

export default ImageDisplay;