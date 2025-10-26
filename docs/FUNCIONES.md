# 🛠️ Documentación de Funciones Utilitarias

## Tabla de Contenidos

1. [identityHash.js](#identityhashjs)
2. [offlineStore.js](#offlinestorejs)
3. [encryptAndPackage.js](#encryptandpackagejs)
4. [sendContractTransaction.js](#sendcontracttransactionjs)

---

## identityHash.js

**Archivo:** `src/funciones/identityHash.js`

**Descripción:** Funciones para manejo de descriptores faciales, hashing y reconocimiento facial.

### Funciones de Conversión

#### `uint8ArrayToBase64(u8)`

Convierte un Uint8Array a string Base64.

```javascript
function uint8ArrayToBase64(u8) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
        const slice = u8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
}
```

**Parámetros:**
- `u8` (Uint8Array): Array de bytes a convertir

**Retorna:** String Base64

---

#### `base64ToUint8Array(b64)`

Convierte un string Base64 a Uint8Array.

```javascript
function base64ToUint8Array(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}
```

**Parámetros:**
- `b64` (string): String Base64 a convertir

**Retorna:** Uint8Array

---

#### `float32ArrayToBase64(f32)`

Convierte un Float32Array a string Base64.

```javascript
function float32ArrayToBase64(f32) {
    return uint8ArrayToBase64(new Uint8Array(f32.buffer));
}
```

**Parámetros:**
- `f32` (Float32Array): Array de floats a convertir

**Retorna:** String Base64

**Uso:** Guardar descriptores faciales en localStorage

---

#### `base64ToFloat32Array(b64)`

Convierte un string Base64 a Float32Array.

```javascript
function base64ToFloat32Array(b64) {
    const u8 = base64ToUint8Array(b64);
    return new Float32Array(u8.buffer);
}
```

**Parámetros:**
- `b64` (string): String Base64 a convertir

**Retorna:** Float32Array

**Uso:** Recuperar descriptores faciales desde localStorage

---

### Funciones de Hash

#### `arrayBufferToHex(buffer)`

Convierte un ArrayBuffer a string hexadecimal.

```javascript
function arrayBufferToHex(buffer) {
    const u8 = new Uint8Array(buffer);
    return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

**Parámetros:**
- `buffer` (ArrayBuffer): Buffer a convertir

**Retorna:** String hexadecimal (ej: "0a1b2c3d...")

---

#### `sha256HexFromBuffer(buffer)`

Calcula el hash SHA-256 de un buffer y lo retorna como hexadecimal.

```javascript
async function sha256HexFromBuffer(buffer) {
    const h = await crypto.subtle.digest("SHA-256", buffer);
    return "0x" + arrayBufferToHex(h);
}
```

**Parámetros:**
- `buffer` (ArrayBuffer): Buffer a hashear

**Retorna:** Promise<string> - Hash hexadecimal con prefijo "0x"

**Ejemplo:**
```javascript
const hash = await sha256HexFromBuffer(descriptor.buffer);
// "0xa1b2c3d4e5f6..."
```

---

### Funciones de Comparación

#### `euclideanDistance(a, b)`

Calcula la distancia euclidiana entre dos vectores.

```javascript
function euclideanDistance(a, b) {
    if (a.length !== b.length) throw new Error("length mismatch");
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}
```

**Parámetros:**
- `a` (Float32Array): Primer vector
- `b` (Float32Array): Segundo vector

**Retorna:** number - Distancia euclidiana

**Uso:** Comparar descriptores faciales para verificación

**Ejemplo:**
```javascript
const distance = euclideanDistance(storedDesc, newDesc);
if (distance <= 0.5) {
    console.log("Match! ✅");
}
```

---

### Funciones de Carga

#### `loadModels()`

Carga los modelos de face-api.js desde la carpeta `/models`.

```javascript
async function loadModels() {
    const MODEL_URL = `${window.location.origin}/models`;
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
}
```

**Retorna:** Promise<void>

**Modelos cargados:**
1. `tinyFaceDetector` - Detección de rostros
2. `faceLandmark68Net` - Detección de 68 puntos faciales
3. `faceRecognitionNet` - Extracción de descriptor facial

---

## offlineStore.js

**Archivo:** `src/funciones/offlineStore.js`

**Descripción:** Funciones para almacenamiento offline en IndexedDB usando localforage.

### Configuración

```javascript
localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'IdentityDB',
    version: 1.0,
    storeName: 'sample_images',
    description: 'Almacén de imágenes de muestra facial para IPFS'
});
```

---

### Funciones de Guardado

#### `saveImageOffline(imageBlob)`

Guarda un Blob de imagen en IndexedDB y devuelve una clave única.

```javascript
export async function saveImageOffline(imageBlob) {
    const key = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await localforage.setItem(key, imageBlob);
    return key;
}
```

**Parámetros:**
- `imageBlob` (Blob): Blob de la imagen a guardar

**Retorna:** Promise<string> - Clave única generada

**Ejemplo:**
```javascript
const canvas = document.createElement('canvas');
const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
const key = await saveImageOffline(blob);
// "img-1234567890-abc123"
```

---

### Funciones de Recuperación

#### `getAndDeleteImageOffline(key)`

Recupera y elimina un Blob de imagen de IndexedDB.

```javascript
export async function getAndDeleteImageOffline(key) {
    const imageBlob = await localforage.getItem(key);
    if (imageBlob) {
        await localforage.removeItem(key);
    }
    return imageBlob;
}
```

**Parámetros:**
- `key` (string): Clave del Blob

**Retorna:** Promise<Blob | null> - Blob de la imagen o null

**Uso:** Obtener imagen para procesamiento y luego eliminarla

---

#### `getImagenBlob(key)`

Recupera un Blob de imagen de IndexedDB sin eliminarlo.

```javascript
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
```

**Parámetros:**
- `key` (string): Clave del Blob

**Retorna:** Promise<Blob | null> - Blob de la imagen o null

**Uso:** Obtener imagen para mostrar o procesar sin eliminar

---

#### `getImageObjectURL(key)`

Recupera un Blob de imagen y crea una URL de objeto temporal.

```javascript
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
```

**Parámetros:**
- `key` (string): Clave del Blob

**Retorna:** Promise<string | null> - URL de objeto o null

**Uso:** Mostrar imagen en elemento `<img src={url}>`

**⚠️ Importante:** Revocar la URL con `URL.revokeObjectURL(url)` cuando ya no se necesite.

---

### Funciones de Eliminación

#### `DeleteImageOffline(key)`

Elimina un Blob de imagen de IndexedDB.

```javascript
export async function DeleteImageOffline(key) {
    await localforage.removeItem(key);
    console.log(`Imagen eliminada offline para la clave: ${key}`);
    return null;
}
```

**Parámetros:**
- `key` (string): Clave del Blob a eliminar

**Retorna:** Promise<null>

---

#### `deletePersonFromLocalStorage(hashIdentidadToRemove)`

Elimina un registro de persona y todas sus imágenes asociadas.

```javascript
export async function deletePersonFromLocalStorage(hashIdentidadToRemove) {
    const STORAGE_KEY = 'peopleList';
    const cleanPromises = [];

    try {
        // 1. Obtener lista
        const storedList = window.localStorage.getItem(STORAGE_KEY);
        const peopleList = JSON.parse(storedList);

        // 2. Encontrar persona
        const personToDelete = peopleList.find(
            person => person.hashIdentidad === hashIdentidadToRemove
        );

        // 3. Eliminar imágenes de IndexedDB
        if (personToDelete.offlineImageKey) {
            cleanPromises.push(DeleteImageOffline(personToDelete.offlineImageKey));
        }
        if (personToDelete.offlineImageDNIKey) {
            cleanPromises.push(DeleteImageOffline(personToDelete.offlineImageDNIKey));
        }

        // 4. Esperar todas las eliminaciones
        await Promise.all(cleanPromises);

        // 5. Filtrar y guardar nueva lista
        const updatedList = peopleList.filter(
            person => person.hashIdentidad !== hashIdentidadToRemove
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    } catch (error) {
        console.error("Error crítico al eliminar la persona o imágenes:", error);
        throw error;
    }
}
```

**Parámetros:**
- `hashIdentidadToRemove` (string): Hash de identidad de la persona a eliminar

**Retorna:** Promise<void>

**Uso:** Limpiar datos después de subir a IPFS y blockchain

---

### Funciones de Consulta

#### `getAllPendingKeys()`

Devuelve todas las claves de imágenes pendientes.

```javascript
export async function getAllPendingKeys() {
    return localforage.keys();
}
```

**Retorna:** Promise<string[]> - Array de claves

---

## encryptAndPackage.js

**Archivo:** `src/funciones/encryptAndPackage.js`

**Descripción:** Funciones para cifrado, empaquetado y subida a IPFS.

### Variables de Entorno

```javascript
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY;
const CLAVE_CRIPTO = process.env.REACT_APP_CLAVE_CRIPTO;
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
```

---

### Funciones de Cifrado

#### `encryptAndPackage(imageFile1, imageFile2, jsonData)`

Cifra dos archivos de imagen y un objeto JSON, empaquetándolos en un JSON cifrado.

```javascript
async function encryptAndPackage(imageFile1, imageFile2, jsonData) {
    // Función auxiliar para cifrar archivos
    const readFileAndEncrypt = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
                    const encrypted = CryptoJS.AES.encrypt(
                        wordArray.toString(CryptoJS.enc.Hex),
                        CLAVE_CRIPTO
                    ).toString();
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

    // Cifrar ambas imágenes en paralelo
    const [img1Encrypted, img2Encrypted] = await Promise.all([
        readFileAndEncrypt(imageBlob1),
        readFileAndEncrypt(imageBlob2),
    ]);

    // Cifrar JSON
    const jsonString = JSON.stringify(jsonData);
    const jsonEncrypted = CryptoJS.AES.encrypt(jsonString, CLAVE_CRIPTO).toString();

    // Empaquetar
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
```

**Parámetros:**
- `imageFile1` (Blob): Primer archivo de imagen (generalmente selfie)
- `imageFile2` (Blob): Segundo archivo de imagen (generalmente DNI)
- `jsonData` (Object): Datos JSON a cifrar

**Retorna:** Promise<{encryptedData: string, encryptionKey: string}>

**Algoritmo:**
1. Lee los archivos como ArrayBuffer
2. Los convierte a WordArray de CryptoJS
3. Cifra con AES usando la clave de entorno
4. Empaqueta todo en un JSON

---

### Funciones de IPFS

#### `uploadToPinata(person)`

Sube los datos cifrados de una persona a IPFS (Pinata).

```javascript
async function uploadToPinata(person) {
    const { encryptedData, encryptionKey } = await encryptAndPackage(
        person.offlineImageDNIKey,
        person.offlineImageKey,
        person
    );

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
        console.error("Error subiendo a Pinata:", error.response?.data || error.message);
        throw new Error("Fallo al subir a IPFS (Pinata).");
    }
}
```

**Parámetros:**
- `person` (Object): Objeto persona con datos y claves de imágenes

**Retorna:** Promise<{ipfsCid: string, encryptionKey: string}>

**Proceso:**
1. Cifra los datos de la persona
2. Sube a Pinata mediante API
3. Elimina los datos locales
4. Retorna el CID de IPFS

---

### Funciones de Descifrado

#### `decryptAndRetrieve(ipfsCid)`

Descarga el paquete cifrado de IPFS y descifra su contenido.

```javascript
async function decryptAndRetrieve(ipfsCid) {
    // 1. Descargar de IPFS
    const url = `${IPFS_GATEWAY}${ipfsCid}`;
    const response = await axios.get(url);
    const encryptedPackage = response.data;

    // 2. Función auxiliar para descifrar archivos
    const decryptFile = (encryptedFileData) => {
        const decryptedHex = CryptoJS.AES.decrypt(
            encryptedFileData.data,
            CLAVE_CRIPTO
        ).toString(CryptoJS.enc.Utf8);

        const bytes = CryptoJS.enc.Hex.parse(decryptedHex);
        const buffer = new Uint8Array(bytes.sigBytes);
        for (let i = 0; i < bytes.sigBytes; i++) {
            buffer[i] = (bytes.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

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

    // 4. Descifrar JSON
    const decryptedJsonString = CryptoJS.AES.decrypt(
        encryptedPackage.data,
        CLAVE_CRIPTO
    ).toString(CryptoJS.enc.Utf8);
    const decryptedJson = JSON.parse(decryptedJsonString);

    return {
        images: [image1, image2],
        json: decryptedJson,
    };
}
```

**Parámetros:**
- `ipfsCid` (string): Content ID del paquete en IPFS

**Retorna:** Promise<{images: Array<{filename, dataUrl}>, json: Object}>

**Uso:** Recuperar datos de IPFS para verificación o auditoría

---

## sendContractTransaction.js

**Archivo:** `src/funciones/sendContractTransaction.js`

**Descripción:** Funciones para interacción con contratos inteligentes de Ethereum.

### Configuración del Contrato

```javascript
const CONTRACT_ADDRESS = "0xb86bdcf91acba3ab2fccacbaf50a3ce6c1c56d5c";
const CONTRACT_ABI = [ /* ABI del contrato */ ];
const SEPOLIA_CHAIN_ID = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
```

---

### Funciones de Conexión

#### `getSepoliaSigner()`

Conecta a MetaMask, verifica y cambia a la red Sepolia si es necesario.

```javascript
async function getSepoliaSigner() {
    if (!window.ethereum) {
        throw new Error("MetaMask no está instalado.");
    }

    // 1. Solicitar conexión de cuentas
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // 2. Crear proveedor y obtener red
    let provider = new ethers.BrowserProvider(window.ethereum);
    let network = await provider.getNetwork();

    // 3. Verificar si estamos en Sepolia
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
        // 4. Intentar cambiar de red
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
        });

        provider = new ethers.BrowserProvider(window.ethereum);
        network = await provider.getNetwork();

        if (network.chainId !== SEPOLIA_CHAIN_ID) {
            throw new Error("Por favor, cambia manualmente tu wallet a la red Sepolia.");
        }
    }

    // 5. Obtener Signer
    return provider.getSigner();
}
```

**Retorna:** Promise<ethers.Signer>

**Manejo de errores:**
- Error 4001: Usuario rechazó la solicitud

---

### Funciones de Transacción

#### `crearIdentidad(hashIdentidad, ipfsCID)`

Crea una identidad en el contrato inteligente.

```javascript
export async function crearIdentidad(hashIdentidad, ipfsCID) {
    try {
        // 1. Validar hash
        if (!hashIdentidad.startsWith("0x") || hashIdentidad.length !== 66) {
            throw new Error("El hash de identidad debe ser un string hexadecimal de 66 caracteres.");
        }

        // 2. Obtener signer
        const signer = await getSepoliaSigner();
        console.log("Cuenta conectada:", await signer.getAddress());

        // 3. Crear instancia del contrato
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // 4. Llamar función createId
        console.log("Enviando transacción...");
        const tx = await contract.createId(hashIdentidad, ipfsCID);
        console.log("Transacción enviada. Hash:", tx.hash);

        // 5. Esperar confirmación
        const receipt = await tx.wait();
        console.log("✅ Identidad creada en el bloque:", receipt.blockNumber);

        return receipt;

    } catch (error) {
        console.error("❌ Error al crear la identidad:", error.message);
        return { success: false, error: error.message };
    }
}
```

**Parámetros:**
- `hashIdentidad` (string): Hash de identidad (66 caracteres hexadecimales con "0x")
- `ipfsCID` (string): Content ID de IPFS

**Retorna:** Promise<TransactionReceipt | {success: false, error: string}>

**Eventos emitidos:**
```solidity
event NuevaId(
    bytes32 indexed _hashIdentidad,
    address indexed _direccion,
    uint256 _timestamp,
    string _mensaje
);
```

---

## Ejemplos de Uso Completo

### Flujo Completo de Enrolamiento

```javascript
// 1. Capturar selfie
const descriptor = await faceapi.detectSingleFace(canvas)
    .withFaceDescriptor();
const hash = await sha256HexFromBuffer(descriptor.buffer);

// 2. Guardar localmente
localStorage.setItem("descriptor_b64", float32ArrayToBase64(descriptor));
localStorage.setItem("hashIdentidad", hash);

const imageBlob = await canvas.toBlob();
const key1 = await saveImageOffline(imageBlob);

// 3. Capturar DNI y verificar
const detection = await faceapi.detectSingleFace(canvas).withFaceDescriptor();
const storedDesc = base64ToFloat32Array(localStorage.getItem("descriptor_b64"));
const distance = euclideanDistance(storedDesc, detection.descriptor);

if (distance <= 0.5) {
    const dniBlob = await canvas.toBlob();
    const key2 = await saveImageOffline(dniBlob);
    
    // 4. Completar formulario
    const person = { /* datos del formulario */ };
    
    // 5. Subir a IPFS
    const { ipfsCid } = await uploadToPinata(person);
    
    // 6. Registrar en blockchain
    const result = await crearIdentidad(hash, ipfsCid);
    
    console.log("✅ Proceso completo:", result);
}
```

---

## Mejores Prácticas

1. **Siempre validar entradas** antes de procesar
2. **Manejar errores** apropiadamente con try/catch
3. **Limpiar URLs de objeto** después de usarlas
4. **Verificar conexión a red** antes de transacciones
5. **Usar async/await** para código asíncrono legible
6. **Validar hashes** antes de enviar a blockchain
7. **Logging adecuado** para debugging
