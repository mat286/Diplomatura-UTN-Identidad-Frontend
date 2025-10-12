# PoC: Enrolamiento y Verificación Facial (face-api.js)

Este proyecto es una Prueba de Concepto (PoC) implementada en React para demostrar el **enrolamiento** y la **verificación (matching)** de identidad facial utilizando la librería `face-api.js`.
"https://github.com/justadudewhohacks/face-api.js/tree/master"

El mecanismo central es la extracción de un **Descriptor Facial** (un vector matemático único que representa la cara), que se almacena en el navegador y se usa para comparar futuras capturas.

## 🚀 Requisitos y Configuración

### 1. Modelos Necesarios

La aplicación depende de la carga de tres modelos de red neuronal. **Debes descargar los archivos JSON y Weights** (incluidos los `shards` y `manifests`) para los siguientes modelos y colocarlos en la carpeta **`public/models`** de tu proyecto React:

| Modelo en el Código | Propósito | Archivo JSON Principal |
| :--- | :--- | :--- |
| `tinyFaceDetector` | Detección de rostro. | `tiny_face_detector_model.json` |
| `faceLandmark68Net` | Detección de 68 puntos clave. | `face_landmark_68_model.json` |
| `faceRecognitionNet` | Extracción del Descriptor Facial. | `face_recognition_model.json` |

### 2. Estructura de Archivos

Tu directorio `public` debe tener la siguiente estructura:
```
/public
└── models/
├── tiny_face_detector_model.json
├── face_landmark_68_model.json
└── face_recognition_model.json
└── ... (Archivos de pesos/weights/shards)
```

## 🛠️ Explicación del Funcionamiento del Código

El código (`App.jsx`) implementa el flujo de enrolamiento y verificación usando el almacenamiento local del navegador (`localStorage`) para persistir la información de identidad.

### 1. Inicialización (`useEffect` & `loadModels`)

1.  **Carga de Modelos:** La función asíncrona `loadModels()` se ejecuta al inicio y llama a `faceapi.nets.XYZ.loadFromUri('/models')` para cargar las tres redes neuronales.
2.  **Cámara:** Una vez que `modelsLoaded` es `true`, un segundo `useEffect` solicita acceso a la cámara (`navigator.mediaDevices.getUserMedia`) e inicia la transmisión en el elemento `<video>`.

### 2. Enrolamiento (`handleEnroll`)

Esta función extrae la "huella digital" de la cara para guardarla:

1.  **Detección y Extracción:** Captura un *frame* en el `<canvas>` y utiliza el *pipeline* de `faceapi.detectSingleFace().withFaceLandmarks().withFaceDescriptor()` para obtener el **Descriptor Facial** (`Float32Array` de 128 elementos).
2.  **Cálculo del Hash de Identidad:** Se calcula un **SHA-256** (`sha256HexFromBuffer`) del Descriptor Facial. Este *hash* sirve como una prueba de integridad o **ID de identidad inmutable**.
3.  **Almacenamiento:**
    * El Descriptor Facial se convierte a **Base64** (`descriptor_b64`) y se guarda en `localStorage`.
    * El hash SHA-256 (`hashIdentidad`) se guarda en `localStorage`.

### 3. Verificación (`handleVerify`)

Esta función comprueba si la cara actual coincide con el registro guardado:

1.  **Nueva Captura y Extracción:** Se obtiene un nuevo Descriptor Facial (`newDesc`) de la persona actual.
2.  **Recuperación:** Se recupera el Descriptor almacenado (`storedFloat`) del `localStorage`.
3.  **Matching por Distancia:** Se calcula la **Distancia Euclidiana** (`euclideanDistance`) entre el Descriptor almacenado y el nuevo.
    * Si la distancia es $\le 0.5$ (la tolerancia configurada), se considera un **MATCH**.
4.  **Verificación Criptográfica (Integridad):** Se recalcula el hash SHA-256 del descriptor almacenado y se compara con el `hashIdentidad` guardado, asegurando que el registro no fue alterado.

### ⚠️ Nota de Seguridad

El código utiliza `localStorage` para guardar el descriptor. **En un entorno de producción, esta información sensible debe ser cifrada robustamente** (por ejemplo, con Web Crypto API o claves derivadas de una contraseña) antes de ser almacenada o enviada a un sistema externo (como IPFS o una *blockchain*).

