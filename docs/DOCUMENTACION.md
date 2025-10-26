# 📚 Documentación Completa del Sistema de Identidad Biométrica

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Flujo de Trabajo](#flujo-de-trabajo)
5. [Componentes Principales](#componentes-principales)
6. [Funciones Utilitarias](#funciones-utilitarias)
7. [Configuración e Instalación](#configuración-e-instalación)
8. [Uso del Sistema](#uso-del-sistema)
9. [Seguridad y Privacidad](#seguridad-y-privacidad)
10. [API y Contratos](#api-y-contratos)

---

## 🎯 Introducción

Este proyecto es un **sistema de registro de identidad biométrica descentralizado** que utiliza reconocimiento facial, almacenamiento en IPFS y blockchain (Ethereum) para registrar identidades de manera segura y verificable.

### Características Principales

- ✅ **Reconocimiento Facial**: Usa `face-api.js` para detección y verificación de rostros
- ✅ **Almacenamiento Offline**: Guarda datos en IndexedDB y localStorage
- ✅ **Cifrado**: Encripta datos sensibles antes de subir a IPFS
- ✅ **Blockchain Integration**: Registra hashes de identidad en contratos inteligentes de Ethereum
- ✅ **Web3**: Compatible con MetaMask y otros proveedores Web3
- ✅ **Interfaz Mobile-First**: Diseñado para dispositivos móviles

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Flujo

```
┌─────────────────┐
│ Pantalla Inicial│
│ (KeyProtocol)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Menú Principal  │
│ (MenuScreen)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Flujo de Enrolamiento            │
├─────────────────────────────────┤
│ 1. Selfie Biométrica            │
│    ↓                            │
│ 2. Foto de DNI                  │
│    ↓                            │
│ 3. Captura de Huella            │
│    ↓                            │
│ 4. Formulario de Datos          │
│    ↓                            │
│ 5. Empaquetado y Cifrado        │
│    ↓                            │
│ 6. Subida a IPFS (Pinata)       │
│    ↓                            │
│ 7. Registro en Blockchain       │
└─────────────────────────────────┘
```

### Estructura de Directorios

```
src/
├── mobile/              # Componentes de la aplicación móvil
│   ├── AppRouter.jsx   # Router principal
│   ├── Enrolamiento.jsx # Flujo completo de enrolamiento
│   ├── KeyProtocolScreen.jsx # Pantalla inicial
│   ├── MenuScreen.jsx  # Menú principal
│   └── ...
├── funciones/          # Funciones utilitarias
│   ├── identityHash.js       # Funciones de biometría
│   ├── offlineStore.js       # Almacenamiento offline
│   ├── encryptAndPackage.js  # Cifrado y empaquetado
│   └── sendContractTransaction.js # Transacciones blockchain
├── Forms.js            # Formulario de registro
├── PeopleList.js       # Lista de personas registradas
└── ...
```

---

## 🔧 Tecnologías Utilizadas

### Frontend
- **React** 19.2.0 - Framework principal
- **React Router** 7.9.4 - Navegación
- **face-api.js** 0.22.2 - Reconocimiento facial

### Blockchain
- **ethers.js** 6.15.0 - Interacción con Ethereum
- **MetaMask** - Wallet Web3

### Almacenamiento
- **localforage** 1.10.0 - Almacenamiento IndexedDB
- **localStorage** - Almacenamiento local

### Cifrado y Seguridad
- **crypto-js** 4.2.0 - Cifrado AES
- **Web Crypto API** - Hash SHA-256

### IPFS
- **ipfs-http-client** 60.0.1 - Cliente IPFS
- **Pinata** - Gateway IPFS

### Otros
- **axios** 1.12.2 - Peticiones HTTP

---

## 🔄 Flujo de Trabajo

### 1. Enrolamiento Biométrico

```javascript
// Paso 1: Capturar selfie y extraer descriptor facial
const descriptor = await faceapi.detectSingleFace(canvas).withFaceDescriptor();
const hashIdentidad = await sha256HexFromBuffer(descriptor.buffer);

// Paso 2: Guardar en localStorage e IndexedDB
localStorage.setItem("descriptor_b64", float32ArrayToBase64(descriptor));
localStorage.setItem("hashIdentidad", hashIdentidad);
await saveImageOffline(imageBlob);
```

### 2. Verificación de Identidad

```javascript
// Capturar nueva muestra y comparar con almacenada
const newDesc = await faceapi.detectSingleFace(canvas).withFaceDescriptor();
const storedDesc = base64ToFloat32Array(localStorage.getItem("descriptor_b64"));
const distance = euclideanDistance(storedDesc, newDesc);

const isMatch = distance <= 0.5; // Tolerancia configurada
```

### 3. Empaquetado y Cifrado

```javascript
// Cifrar imágenes y datos JSON
const encrypted = await encryptAndPackage(image1, image2, jsonData);

// Subir a IPFS
const { ipfsCid } = await uploadToPinata(encrypted);
```

### 4. Registro en Blockchain

```javascript
// Crear identidad en contrato inteligente
await crearIdentidad(hashIdentidad, ipfsCid);
```

---

## 📦 Componentes Principales

### AppRouter.jsx

Componente de enrutamiento principal que define las rutas de la aplicación:

- `/` - Pantalla inicial (KeyProtocolScreen)
- `/menu` - Menú principal
- `/captura-foto` - Flujo de enrolamiento
- `/lista` - Lista de personas registradas

### Enrolamiento.jsx

Componente principal que maneja todo el flujo de enrolamiento biométrico.

**Estados del flujo:**
- `BIOMETRIC_SELFIE` - Captura de selfie biométrica
- `DNI_CAPTURE` - Captura de foto de DNI
- `FINGERPRINT` - Captura de huella digital
- `FORM` - Formulario de datos personales
- `FINAL_SAVED` - Confirmación y empaquetado
- `RESULTADO_FINAL` - Resultado de la transacción

**Funciones principales:**
- `handleCapturePhoto()` - Captura y registra la selfie biométrica
- `handleDniCapture()` - Captura DNI y verifica coincidencia facial
- `handleFingerprintCapture()` - Registra huella digital
- `empaquetar()` - Cifra, sube a IPFS y registra en blockchain

### KeyProtocolScreen.jsx

Pantalla de bienvenida con el logo de KEY protocol y botón para técnicos.

### MenuScreen.jsx

Menú principal con opciones para acceder a:
- Registro de identidades
- Clases (funcionalidad futura)

### Forms.js

Formulario completo de registro de datos personales con validación.

**Campos incluidos:**
- Datos personales (nombre, apellido, DNI, fecha de nacimiento)
- Demografía (sexo, género, etnia)
- Ubicación (zona, provincia)
- Educación (nivel escolar)
- Producción (tipo, superficie, nivel)
- Capacitación (intereses)

### PeopleList.js

Componente que lista todas las personas registradas desde localStorage.

### LoadingSpinner.js

Componente de carga con spinner animado.

### ImageDisplay.js

Componente que muestra imágenes almacenadas en IndexedDB desde una clave.

### TransactionLogs.jsx

Componente que muestra el log de una transacción blockchain con enlaces a Etherscan.

---

## 🛠️ Funciones Utilitarias

### identityHash.js

Funciones para manejo de descriptores faciales y hashing.

**Funciones:**
- `float32ArrayToBase64()` - Convierte Float32Array a Base64
- `base64ToFloat32Array()` - Convierte Base64 a Float32Array
- `sha256HexFromBuffer()` - Calcula hash SHA-256
- `euclideanDistance()` - Calcula distancia euclidiana entre vectores
- `loadModels()` - Carga modelos de face-api.js

### offlineStore.js

Funciones para almacenamiento offline en IndexedDB.

**Funciones:**
- `saveImageOffline()` - Guarda Blob en IndexedDB
- `getAndDeleteImageOffline()` - Obtiene y elimina imagen
- `getImagenBlob()` - Obtiene Blob de imagen
- `getImageObjectURL()` - Crea URL de objeto temporal
- `deletePersonFromLocalStorage()` - Elimina persona y sus imágenes

### encryptAndPackage.js

Funciones para cifrado y empaquetado de datos.

**Funciones:**
- `encryptAndPackage()` - Cifra imágenes y datos JSON
- `uploadToPinata()` - Sube datos cifrados a IPFS
- `decryptAndRetrieve()` - Descarga y descifra datos de IPFS

### sendContractTransaction.js

Funciones para interacción con blockchain.

**Funciones:**
- `getSepoliaSigner()` - Conecta a MetaMask y verifica red Sepolia
- `crearIdentidad()` - Crea identidad en contrato inteligente

---

## ⚙️ Configuración e Instalación

### Requisitos Previos

- Node.js 16.x o superior
- npm o yarn
- Navegador moderno con soporte Web3
- MetaMask instalado
- Cuenta en Pinata (para IPFS)

### Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd identity

# Instalar dependencias
npm install

# Copiar archivos de modelos
# Los modelos de face-api.js deben estar en public/models/
```

### Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
REACT_APP_PINATA_API_KEY=tu_api_key
REACT_APP_PINATA_SECRET_KEY=tu_secret_key
REACT_APP_CLAVE_CRIPTO=tu_clave_cifrado_aes
```

### Modelos de face-api.js

Los modelos deben descargarse e incluirse en `public/models/`:

- `tiny_face_detector_model.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

**Descargar desde:** [face-api.js modelos](https://github.com/justadudewhohacks/face-api.js-models)

### Iniciar la Aplicación

```bash
npm start
```

La aplicación se abrirá en `http://localhost:3000`

---

## 🎮 Uso del Sistema

### Flujo de Usuario

1. **Pantalla Inicial**
   - Presionar botón "TECNICO"

2. **Menú Principal**
   - Seleccionar "IDENTIDADES"

3. **Enrolamiento - Paso 1: Selfie Biométrica**
   - Mostrar rostro claramente
   - Presionar "CAPTURAR FOTO"
   - Presionar "CONTINUAR AL DNI"

4. **Enrolamiento - Paso 2: Foto de DNI**
   - Mostrar DNI con rostro visible
   - Presionar "CAPTURAR FOTO"
   - El sistema verifica que coincida con la selfie
   - Presionar "CONTINUAR A HUELLA"

5. **Enrolamiento - Paso 3: Huella Digital**
   - Presionar "REGISTRAR HUELLA"
   - Presionar "CONTINUAR AL FORMULARIO"

6. **Enrolamiento - Paso 4: Formulario**
   - Completar todos los campos requeridos
   - Presionar "Agregar Persona a la Lista"

7. **Enrolamiento - Paso 5: Publicación**
   - Revisar información
   - Presionar "Publicar Datos"
   - Conectar MetaMask si es necesario
   - Confirmar transacción

### Verificación de Identidad

Para verificar una identidad registrada:

1. Capturar una nueva foto del rostro
2. El sistema compara con el descriptor almacenado
3. Devuelve resultado de matching (distancia euclidiana)

---

## 🔒 Seguridad y Privacidad

### Medidas de Seguridad Implementadas

1. **Cifrado AES-256**
   - Todos los datos sensibles se cifran antes de subir a IPFS
   - La clave de cifrado se maneja en variables de entorno

2. **Hash de Integridad**
   - SHA-256 del descriptor facial para verificar integridad
   - Almacenado en blockchain para inmutabilidad

3. **Almacenamiento Offline**
   - Datos sensibles almacenados localmente en IndexedDB
   - Solo se suben a IPFS con consentimiento del usuario

4. **Verificación Facial**
   - Tolerancia configurable para matching (default: 0.5)
   - Verificación criptográfica de integridad

### Consideraciones de Privacidad

⚠️ **Importante:**
- Los datos biométricos son sensibles
- Se recomienda informar claramente a los usuarios
- Considerar regulaciones de protección de datos (GDPR, etc.)
- Implementar controles de acceso apropiados

### Mejoras Sugeridas

- [ ] Implementar autenticación biométrica adicional
- [ ] Agregar consentimiento explícito del usuario
- [ ] Implementar borrado seguro de datos
- [ ] Auditoría de acceso a datos

---

## 🔗 API y Contratos

### Contrato Inteligente

**Dirección:** `0xb86bdcf91acba3ab2fccacbaf50a3ce6c1c56d5c`

**Red:** Sepolia Testnet

**Funciones Principales:**

1. `createId(bytes32 _hashIdentidad, string _ipfsCID)`
   - Registra una nueva identidad en blockchain
   - Emite evento `NuevaId`

2. `consultarHelpData(bytes32 _hashIdentidad)`
   - Consulta el CID de IPFS asociado a un hash de identidad

### IPFS (Pinata)

- **Gateway:** `https://gateway.pinata.cloud/ipfs/`
- **Formato:** JSON cifrado con imágenes

### Estructura de Datos IPFS

```json
{
  "img1": "cifrado_aes_blob1",
  "img2": "cifrado_aes_blob2",
  "data": "cifrado_aes_json_data",
  "metadata": {
    "timestamp": "ISO_8601"
  }
}
```

---

## 📝 Notas Adicionales

### Debugging

Para ver información de debugging:
1. Abrir herramientas de desarrollador (F12)
2. Revisar Console para logs detallados
3. Network tab para peticiones HTTP
4. Application tab para IndexedDB y localStorage

### Troubleshooting

**Problema:** Modelos no cargan
- Verificar que los archivos estén en `public/models/`
- Revisar la consola para errores de carga

**Problema:** MetaMask no conecta
- Verificar que MetaMask esté instalado
- Verificar conexión a red Sepolia
- Revisar permisos del sitio

**Problema:** Cámara no funciona
- Verificar permisos del navegador
- Usar HTTPS (requerido para getUserMedia)

**Problema:** IPFS falla
- Verificar variables de entorno
- Verificar cuenta de Pinata activa
- Revisar límites de API

### Mejoras Futuras

- [ ] Implementar verificación de documentos OCR
- [ ] Agregar soporte para múltiples redes blockchain
- [ ] Implementar sistema de auditoría
- [ ] Agregar exportación de datos
- [ ] Implementar recuperación de cuenta
- [ ] Agregar multi-idioma
- [ ] Implementar PWA (Progressive Web App)

---

## 👥 Contribuciones

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## 📄 Licencia

Este proyecto está bajo licencia [MIT](LICENSE).

---

## 📞 Contacto

Para preguntas o soporte:
- Email: [riveramateo10432@gmail.com]

---

**Última actualización:** Octubre 2025
