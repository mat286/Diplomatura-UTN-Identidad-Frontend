import CryptoJS from 'crypto-js';
import { deletePersonFromLocalStorage, getImagenBlob } from './offlineStore';
import axios from 'axios';

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY;
const CLAVE_CRIPTO = process.env.REACT_APP_CLAVE_CRIPTO;
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/"; 


/**
 * Cifra dos archivos (File/Blob) y un objeto JSON, empaquetándolos en un único JSON cifrado.
 * @param {File} imageFile1 - Primer archivo de imagen (e.g., el objeto File recuperado con "offlineImageDNIKey").
 * @param {File} imageFile2 - Segundo archivo de imagen (e.g., el objeto File recuperado con "offlineImageKey").
 * @param {Object} jsonData - Datos JSON a cifrar.
 * @returns {Promise<{encryptedData: string, encryptionKey: string}>}
 */
async function encryptAndPackage(imageFile1, imageFile2, jsonData) {
    const imageBlob1 = await getImagenBlob(imageFile1);
    const imageBlob2 = await getImagenBlob(imageFile2);


    const readFileAndEncrypt = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
                    // Cifrar con AES
                    const encrypted = CryptoJS.AES.encrypt(wordArray.toString(CryptoJS.enc.Hex), /* encryptionKey */CLAVE_CRIPTO).toString();
                    resolve({
                        data: encrypted,
                        filename: file.name,
                        filetype: file.type,
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const [img1Encrypted, img2Encrypted] = await Promise.all([
        readFileAndEncrypt(imageBlob1),
        readFileAndEncrypt(imageBlob2),
    ]);

    const jsonString = JSON.stringify(jsonData);
    const jsonEncrypted = CryptoJS.AES.encrypt(jsonString, CLAVE_CRIPTO).toString();

    const packageData = {
        img1: img1Encrypted,
        img2: img2Encrypted,
        data: jsonEncrypted,
        metadata: {
            timestamp: new Date().toISOString()
        }
    };

    return {
        encryptedData: JSON.stringify(packageData),
        encryptionKey: CLAVE_CRIPTO,
    };
}


/**
 * Sube el string de datos cifrados a Pinata (IPFS).
 * @param {string} encryptedString - String con el JSON que contiene los datos cifrados.
 * @returns {Promise<string>} - El Content ID (CID) de IPFS.
 */
async function uploadToPinata(person) {
    const { encryptedData, encryptionKey } = await encryptAndPackage(person.offlineImageDNIKey, person.offlineImageKey, person);
    console.log("Datos cifrados listos para subir.");

    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error("Claves de Pinata no configuradas en las variables de entorno.");
    }

    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

    const headers = {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
        'Content-Type': 'application/json',
    };

    const pinataBody = {
        pinataContent: JSON.parse(encryptedData),
        pinataMetadata: {
            name: `Encrypted_Data_${Date.now()}.json`
        }
    };

    try {
        const response = await axios.post(url, pinataBody, { headers });
        deletePersonFromLocalStorage(person.hashIdentidad);
        return { ipfsCid: response.data.IpfsHash, encryptionKey: encryptionKey }; 
    } catch (error) {
        console.error("Error subiendo a Pinata:", error.response ? error.response.data : error.message);
        throw new Error("Fallo al subir a IPFS (Pinata).");
    }
}





/**
 * Descarga el paquete cifrado de IPFS y descifra su contenido.
 * @param {string} ipfsCid - El Content ID (CID) del paquete en IPFS.
 * @param {string} encryptionKey - La clave simétrica AES usada para cifrar el contenido.
 * @returns {Promise<{images: Array<{filename: string, dataUrl: string}>, json: Object}>}
 */
async function decryptAndRetrieve(ipfsCid) {

    if (!CLAVE_CRIPTO) {
        console.log(CLAVE_CRIPTO, process.env.REACT_APP_CLAVE_CRIPTO)
        throw new Error("Claves de Pinata no configuradas en las variables de entorno.");
    }
    // 1. Descargar el contenido cifrado de IPFS
    const url = `${IPFS_GATEWAY}${ipfsCid}`;
    const response = await axios.get(url);
    const encryptedPackage = response.data; 

    // 2. Función auxiliar para descifrar y convertir a Blob
    const decryptFile = (encryptedFileData) => {
        const decryptedHex = CryptoJS.AES.decrypt(encryptedFileData.data, CLAVE_CRIPTO).toString(CryptoJS.enc.Utf8);

        // Convertir la cadena hexadecimal descifrada a un Array de Bytes
        const bytes = CryptoJS.enc.Hex.parse(decryptedHex);
        const buffer = new Uint8Array(bytes.sigBytes);
        for (let i = 0; i < bytes.sigBytes; i++) {
            buffer[i] = (bytes.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        // Crear un Blob y un data URL para la imagen
        const blob = new Blob([buffer], { type: encryptedFileData.filetype });
        const dataUrl = URL.createObjectURL(blob);

        return {
            filename: encryptedFileData.filename,
            dataUrl: dataUrl,
        };
    };

    // 3. Descifrar imágenes
    const image1 = decryptFile(encryptedPackage.img1);
    const image2 = decryptFile(encryptedPackage.img2);

    // 4. Descifrar los datos JSON
    const decryptedJsonString = CryptoJS.AES.decrypt(encryptedPackage.data, CLAVE_CRIPTO).toString(CryptoJS.enc.Utf8);
    const decryptedJson = JSON.parse(decryptedJsonString);

    return {
        images: [image1, image2],
        json: decryptedJson,
    };
}

export { encryptAndPackage, decryptAndRetrieve, uploadToPinata };