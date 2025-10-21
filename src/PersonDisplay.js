import React, { useState, useEffect, useCallback } from 'react';
// Asegúrate de que esta ruta sea correcta para tu función de descifrado
import { decryptAndRetrieve } from "./funciones/encryptAndPackage";

// Función de ayuda para formatear claves a texto legible (ej: 'fechaNacimiento' -> 'Fecha de Nacimiento')
const formatKey = (key) => {
    // Reemplaza mayúsculas por espacio + minúscula, y luego pone la primera letra en mayúscula
    const formatted = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    // Reemplaza guiones bajos o espacios extra, y capitaliza la primera letra de cada palabra
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Objeto de mapeo para asegurar un orden y un nombre amigable
const FIELD_MAP = {
    nombre: "Nombre",
    apellido: "Apellido",
    dni: "DNI",
    fechaNacimiento: "Fecha de Nacimiento",
    sexo: "Sexo",
    genero: "Género",
    etnia: "Etnia",
    nfamilia: "Núcleo Familiar",
    email: "Email",
    telefono: "Teléfono",
    provincia: "Provincia",
    zona: "Zona",
    nivelEscolar: "Nivel Escolar",
    productor: "Es Productor/a",
    productorOtro: "Tipo de Producción (Otro)",
    nivel: "Nivel Productivo",
    superficiePredio: "Superficie del Predio (ha)",
    superficieProductiva: "Superficie Productiva (ha)",
    interesCapacitacion: "Interés en Capacitación",
    interesCapacitacionOtro: "Capacitación (Otro)",
};


function PersonDisplay({ ipfsCid/* , encryptionKey */ }) {
    const [personData, setPersonData] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAndDecryptData = useCallback(async () => {
        if (!ipfsCid /* || !encryptionKey */) {
            setError("Faltan el CID de IPFS o la Clave de Cifrado.");
            return;
        }

        setLoading(true);
        setError(null);
        setPersonData(null);
        setImages([]);

        try {
            // Llama a la función de descifrado
            const result = await decryptAndRetrieve(ipfsCid/* , encryptionKey */);

            // Filtramos las claves que no están en el mapa o son arrays vacíos, si es necesario
            const filteredData = Object.fromEntries(
                Object.entries(result.json).filter(([key, value]) => {
                    // Ignorar claves que no están en el mapa O valores vacíos/nulos
                    if (!FIELD_MAP.hasOwnProperty(key)) return false;
                    if (value === '' || value === null) return false;
                    if (Array.isArray(value) && value.length === 0) return false;
                    return true;
                })
            );

            setPersonData(filteredData);
            setImages(result.images);

        } catch (err) {
            console.error("Error al obtener o descifrar los datos:", err);
            setError(`Fallo al descargar/descifrar. Posible clave incorrecta o CID inválido. Detalle: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [ipfsCid/* , encryptionKey */]);

    useEffect(() => {
        fetchAndDecryptData();
    }, [fetchAndDecryptData]);


    if (loading) {
        return <div style={styles.loading}>Cargando y descifrando información...</div>;
    }

    if (error) {
        return <div style={styles.error}>❌ Error: {error}</div>;
    }

    if (!personData) {
        // Muestra un mensaje amigable si no hay datos y no hay error
        return <div style={styles.info}>Ingresa un CID y una Clave válidos para ver la información.</div>;
    }

    // Función para renderizar el valor, manejando arrays
    const renderValue = (value) => {
        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : 'No aplica';
        }
        return value || 'No especificado';
    };


    return (
        <div style={styles.card}>
            <h2 style={styles.header}>
                <span style={{ color: '#007bff' }}>Datos Descifrados</span> de {personData.nombre || ''} {personData.apellido || ''}
            </h2>

            <div style={styles.contentGrid}>
                {/* Iterar sobre el mapa para mantener el orden y usar los nombres amigables */}
                {Object.keys(FIELD_MAP).map((key) => {
                    const value = personData[key];
                    if (value === undefined) return null; // No mostrar si no existe en los datos descifrados

                    return (
                        <div key={key} style={styles.dataItem}>
                            <span style={styles.dataLabel}>{FIELD_MAP[key]}:</span>
                            <span style={styles.dataValue}>{renderValue(value)}</span>
                        </div>
                    );
                })}
            </div>

            <hr style={styles.divider} />

            {/* SECCIÓN DE IMÁGENES */}
            <h3 style={styles.subheader}>🖼️ Archivos Adjuntos Cifrados ({images.length})</h3>
            <p style={styles.imageTip}>*Las imágenes se han descifrado y se muestran en el navegador.</p>

            <div style={styles.imageGallery}>
                {images.map((image, index) => (
                    <div key={index} style={styles.imageWrapper}>
                        <img
                            src={image.dataUrl}
                            alt={`Adjunto ${index + 1}: ${image.filename}`}
                            style={styles.image}
                        />
                        <p style={styles.imageCaption}>{image.filename}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Estilos base (puedes moverlos a un archivo CSS o a styled-components)
const styles = {
    card: {
        maxWidth: '900px',
        margin: '40px auto',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
    },
    header: {
        borderBottom: '2px solid #007bff',
        paddingBottom: '15px',
        marginBottom: '20px',
        fontSize: '1.8em',
        color: '#333',
    },
    subheader: {
        color: '#555',
        marginTop: '30px',
        marginBottom: '15px',
        borderLeft: '4px solid #f0ad4e',
        paddingLeft: '10px',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
    },
    dataItem: {
        padding: '10px 15px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        borderLeft: '3px solid #007bff',
    },
    dataLabel: {
        fontWeight: 'bold',
        color: '#333',
        display: 'block',
        marginBottom: '4px',
        fontSize: '0.9em',
    },
    dataValue: {
        color: '#555',
        fontSize: '1em',
    },
    divider: {
        marginTop: '30px',
        marginBottom: '30px',
        borderColor: '#ddd',
    },
    imageGallery: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        justifyContent: 'center',
    },
    imageWrapper: {
        width: 'calc(50% - 10px)', // Dos por fila en el ejemplo
        minWidth: '250px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    },
    image: {
        width: '100%',
        height: 'auto',
        maxHeight: '200px',
        objectFit: 'contain',
        backgroundColor: '#eee', // Fondo para imágenes transparentes
    },
    imageCaption: {
        textAlign: 'center',
        padding: '8px',
        margin: '0',
        fontSize: '0.9em',
        backgroundColor: '#f0f0f0',
        color: '#666',
    },
    loading: {
        textAlign: 'center',
        padding: '20px',
        fontSize: '1.2em',
        color: '#007bff',
    },
    error: {
        textAlign: 'center',
        padding: '20px',
        fontSize: '1.2em',
        color: '#dc3545',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '5px',
    },
    info: {
        textAlign: 'center',
        padding: '20px',
        fontSize: '1.2em',
        color: '#6c757d',
    },
    imageTip: {
        fontStyle: 'italic',
        color: '#888',
        fontSize: '0.9em',
        marginBottom: '20px',
        textAlign: 'center',
    }
};

export default PersonDisplay;