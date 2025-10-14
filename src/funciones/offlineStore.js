import localforage from 'localforage';

// Configura la instancia de localforage para nuestras imágenes
localforage.config({
    driver: localforage.INDEXEDDB, // Fuerza el uso de IndexedDB
    name: 'IdentityDB',
    version: 1.0,
    storeName: 'sample_images', // Nombre del almacén de objetos
    description: 'Almacén de imágenes de muestra facial para IPFS'
});

/**
 * Guarda un Blob de imagen en IndexedDB y devuelve una clave única.
 * @param {Blob} imageBlob - El objeto Blob de la imagen capturada.
 * @returns {Promise<string>} La clave única usada para guardar el Blob.
 */
export async function saveImageOffline(imageBlob) {
    // Usa un timestamp único como clave
    const key = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await localforage.setItem(key, imageBlob);
    /* console.log(`Imagen guardada offline con clave: ${key}`); */
    return key;
}

/**
 * Recupera el Blob de imagen de IndexedDB.
 * @param {string} key - La clave del Blob.
 * @returns {Promise<Blob | null>} El Blob de la imagen o null.
 */
export async function getAndDeleteImageOffline(key) {
    const imageBlob = await localforage.getItem(key);
    if (imageBlob) {
        // Elimina inmediatamente tras la recuperación para limpieza
        await localforage.removeItem(key);
        /* console.log(`Imagen recuperada y eliminada offline para la clave: ${key}`); */
    }
    return imageBlob;
}


/**
 * Recupera el Blob de imagen de IndexedDB y crea una URL temporal para mostrarla.
 * NO ELIMINA el item de la base de datos.
 * @param {string} key - La clave del Blob.
 * @returns {Promise<string | null>} La URL de Objeto (Object URL) de la imagen, o null.
 */
export async function getImageObjectURL(key) {
    if (!key) return null;
    try {
        const imageBlob = await localforage.getItem(key);
        if (imageBlob) {
            const objectURL = URL.createObjectURL(imageBlob);
            /* console.log(`Imagen recuperada offline para la clave: ${key}`, objectURL); */
            return objectURL;
        }
        return null;
    } catch (e) {
        console.error(`Error al recuperar imagen offline con clave ${key}:`, e);
        return null;
    }
}

/**
 * Devuelve todas las claves de imágenes pendientes de subida.
 * @returns {Promise<string[]>} Array de claves.
 */
export async function getAllPendingKeys() {
    return localforage.keys();
}