import React, { useState, useEffect } from 'react';
import { getImageObjectURL } from './funciones/offlineStore'; // Importa la nueva función

// Asume que este componente recibe la clave de la imagen
function ImageDisplay({ offlineImageKey, tamaño = { width: "100%", height: "auto", radius: false } }) {
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
        let currentObjectURL = null;

        // 1. Cargar la imagen y crear la URL
        const loadAndDisplayImage = async () => {
            const url = await getImageObjectURL(offlineImageKey);
            if (url) {
                currentObjectURL = url; // Guarda la referencia para revocar
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
                // ¡Paso CRÍTICO! Libera la memoria ocupada por el Blob.
                URL.revokeObjectURL(currentObjectURL);
            }
        };
    }, [offlineImageKey]); // Se ejecuta cuando la clave de la imagen cambia

    if (!imageUrl) {
        return <div>Cargando imagen de muestra...</div>;
    }

    return (
        <div>
            {/* <p>Muestra Facial (Guardada Offline)</p> */}
            <img
                src={imageUrl}
                alt="Muestra de Enrolamiento Offline"
                style={{ width: tamaño.width, maxWidth: '400px', height: tamaño.height, borderRadius: tamaño.radius ? '50%' : '8px' }}
            />
        </div>
    );
}

export default ImageDisplay;