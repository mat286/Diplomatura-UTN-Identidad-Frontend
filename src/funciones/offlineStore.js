import localforage from 'localforage';

// Configura la instancia de localforage para nuestras imágenes
localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'IdentityDB',
    version: 1.0,
    storeName: 'sample_images',
    description: 'Almacén de imágenes de muestra facial para IPFS'
});

/**
 * Guarda un Blob de imagen en IndexedDB y devuelve una clave única.
 * @param {Blob} imageBlob - El objeto Blob de la imagen capturada.
 * @returns {Promise<string>} La clave única usada para guardar el Blob.
 */
export async function saveImageOffline(imageBlob) {
    const key = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await localforage.setItem(key, imageBlob);
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
        await localforage.removeItem(key);
    }
    return imageBlob;
}


/**
 * Recupera el Blob de imagen de IndexedDB y la retorna.
 * NO ELIMINA el item de la base de datos.
 * @param {string} key - La clave del Blob.
 * @returns {Promise<string | null>} La URL de Objeto (Object URL) de la imagen, o null.
 */
export async function getImagenBlob(key) {
    if (!key) return null;
    try {
        const imageBlob = await localforage.getItem(key);
        if (imageBlob) {
            return imageBlob;
        }
        return null;

    } catch (e) {
        console.error(`Error al recuperar imagen offline con clave ${key}:`, e);
        return null;
    }
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
            return objectURL;
        }
        return null;
    } catch (e) {
        console.error(`Error al recuperar imagen offline con clave ${key}:`, e);
        return null;
    }
}


/**
 * Recupera el Blob de imagen de IndexedDB y crea una URL temporal para mostrarla.
 * NO ELIMINA el item de la base de datos.
 * @param {string} key - La clave del Blob.
 * @returns {Promise<string | null>} La URL de Objeto (Object URL) de la imagen, o null.
 */
export async function DeleteImageOffline(key) {
    await localforage.removeItem(key);
    console.log(`Imagen eliminada offline para la clave: ${key}`);
    return null;
}



/**
 * Elimina un registro de persona de la lista 'peopleList' en localStorage basado en el hashIdentidad,
 * y elimina de forma asíncrona las imágenes asociadas de IndexedDB (localforage).
 * * @param {string} hashIdentidadToRemove - El 'hashIdentidad' de la persona a eliminar.
 * @returns {Promise<void>}
 */
export async function deletePersonFromLocalStorage(hashIdentidadToRemove) {
    const STORAGE_KEY = 'peopleList';
    const cleanPromises = []; 

    try {
        const storedList = window.localStorage.getItem(STORAGE_KEY);
        if (!storedList) {
            console.warn(`No se encontró la clave "${STORAGE_KEY}" en localStorage.`);
            return;
        }

        const peopleList = JSON.parse(storedList);

        const personToDelete = peopleList.find(
            person => person.hashIdentidad === hashIdentidadToRemove
        );

        if (!personToDelete) {
            console.warn(`No se encontró la persona con hashIdentidad: ${hashIdentidadToRemove}.`);
            return;
        }

        // 1. Iniciar la eliminación ASÍNCRONA de imágenes en IndexedDB
        if (personToDelete.offlineImageKey) {
            // Empuja la Promesa al array, pero NO la espera todavía
            cleanPromises.push(DeleteImageOffline(personToDelete.offlineImageKey));
        }
        if (personToDelete.offlineImageDNIKey) {
            cleanPromises.push(DeleteImageOffline(personToDelete.offlineImageDNIKey));
        }

        // 2. Esperar a que TODAS las eliminaciones de imágenes terminen
        await Promise.all(cleanPromises); // <--- CLAVE: USAR AWAIT Y Promise.all()

        // 3. Filtrar para crear la nueva lista
        const updatedList = peopleList.filter(
            person => person.hashIdentidad !== hashIdentidadToRemove
        );

        // 4. Guardar la nueva lista en localStorage
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

        console.log(`✅ Persona y archivos temporales eliminados con éxito para Hash: ${hashIdentidadToRemove}.`);

    } catch (error) {
        console.error("Error crítico al eliminar la persona o imágenes:", error);
        throw new Error("No se pudo completar la eliminación. Revisa los permisos y la conexión a IndexedDB.");
    }
}


/**
 * Devuelve todas las claves de imágenes pendientes de subida.
 * @returns {Promise<string[]>} Array de claves.
 */
export async function getAllPendingKeys() {
    return localforage.keys();
}

