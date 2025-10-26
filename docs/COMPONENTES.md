# 📦 Documentación de Componentes React

## Tabla de Contenidos

1. [AppRouter](#approuter)
2. [Enrolamiento](#enrolamiento)
3. [KeyProtocolScreen](#keyprotocolscreen)
4. [MenuScreen](#menuscreen)
5. [Forms](#forms)
6. [PeopleList](#peoplelist)
7. [ImageDisplay](#imagedisplay)
8. [LoadingSpinner](#loadingspinner)
9. [TransactionLogs](#transactionlogs)

---

## AppRouter

**Archivo:** `src/mobile/AppRouter.jsx`

**Descripción:** Componente de enrutamiento principal que maneja la navegación entre pantallas de la aplicación.

### Rutas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `KeyProtocolScreen` | Pantalla inicial con logo y botón de acceso |
| `/menu` | `MenuScreen` | Menú principal con opciones |
| `/captura-foto` | `Enrolamiento` | Flujo completo de enrolamiento biométrico |
| `/lista` | `PeopleList` | Lista de personas registradas |

### Código

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const AppRouter = () => {
    return (
        <BrowserRouter>
            <div className="app-main-container">
                <Routes>
                    <Route path="/" element={<KeyProtocolScreen />} />
                    <Route path="/menu" element={<MenuScreen />} />
                    <Route path="/captura-foto" element={<Enrolamiento />} />
                    <Route path="/lista" element={<PeopleList />} />
                    <Route path="*" element={<div>404 | Página no encontrada</div>} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};
```

---

## Enrolamiento

**Archivo:** `src/mobile/Enrolamiento.jsx`

**Descripción:** Componente principal que maneja el flujo completo de enrolamiento biométrico de identidad.

### Estados del Flujo

```javascript
const FLOW_STEPS = {
    BIOMETRIC_SELFIE: 'biometric_selfie',         // 1. Captura de Selfie
    SELFIE_COMPLETE: 'selfie_complete',           // 2. Selfie tomada (Listo para DNI)
    DNI_CAPTURE: 'dni_capture',                   // 3. Captura de DNI
    DNI_COMPLETE: 'dni_complete',                 // 4. Foto de DNI aceptada
    FINGERPRINT: 'fingerprint',                   // 5. Captura de Huella
    FINGERPRINT_COMPLETE: 'fingerprint_complete', // 6. Huella aceptada
    FORM: 'form',                                 // 7. Formulario 
    FINAL_SAVED: 'final_saved',                   // 8. Proceso Terminado
    RESULTADO_FINAL: 'resultado_final',           // 9. Resultado final
}
```

### Estados Principales

- `modelsLoaded`: Indica si los modelos de AI están cargados
- `message`: Mensaje de estado actual
- `step`: Paso actual del flujo
- `data`: Objeto con imágenes y datos del formulario
- `isLoading`: Indica si hay operaciones en progreso

### Funciones Principales

#### `handleCapturePhoto()`

Captura la selfie biométrica y registra el descriptor facial.

```javascript
async function handleCapturePhoto() {
    // 1. Detectar rostro
    const detection = await faceapi.detectSingleFace(canvas)
        .withFaceLandmarks()
        .withFaceDescriptor();
    
    // 2. Extraer descriptor y calcular hash
    const descriptor = detection.descriptor;
    const hash = await sha256HexFromBuffer(descriptor.buffer);
    
    // 3. Guardar en localStorage
    localStorage.setItem("descriptor_b64", float32ArrayToBase64(descriptor));
    localStorage.setItem("hashIdentidad", hash);
    
    // 4. Guardar imagen offline
    const imageBlob = await canvas.toBlob();
    const offlineKey = await saveImageOffline(imageBlob);
}
```

#### `handleDniCapture()`

Captura la foto del DNI y verifica que coincida con la selfie.

```javascript
async function handleDniCapture() {
    // 1. Detectar rostro en DNI
    const detection = await faceapi.detectSingleFace(canvas)
        .withFaceDescriptor();
    
    // 2. Comparar con selfie registrada
    const storedDesc = base64ToFloat32Array(
        localStorage.getItem("descriptor_b64")
    );
    const distance = euclideanDistance(storedDesc, newDesc);
    
    // 3. Verificar coincidencia (tolerancia: 0.5)
    if (distance <= 0.5) {
        // Guardar foto del DNI
    }
}
```

#### `empaquetar()`

Cifra, empaqueta y sube los datos a IPFS, luego registra en blockchain.

```javascript
async function empaquetar() {
    setIsLoading(true);
    
    // 1. Subir a IPFS (Pinata)
    const { ipfsCid } = await uploadToPinata(person);
    
    // 2. Registrar en blockchain
    const result = await crearIdentidad(hashIdentidad, ipfsCid);
    
    setIsLoading(false);
}
```

### Props y Estados

No recibe props, maneja su propio estado interno.

---

## KeyProtocolScreen

**Archivo:** `src/mobile/KeyProtocolScreen.jsx`

**Descripción:** Pantalla de bienvenida inicial de la aplicación.

### Funcionalidad

- Muestra el logo de KEY protocol
- Proporciona botón de acceso para técnicos
- Navega al menú principal al hacer clic

### Componentes Internos

```jsx
<div className="logo-section">
    <img src="/logo.png" alt="Key Protocol Logo" />
    <h1>KEY</h1>
    <h2>protocol</h2>
    <p>Registro de actividades descentralizado y offline</p>
</div>
<button onClick={handleLogin}>TECNICO</button>
```

---

## MenuScreen

**Archivo:** `src/mobile/MenuScreen.jsx`

**Descripción:** Menú principal con opciones de navegación.

### Opciones Disponibles

1. **IDENTIDADES** - Accede al flujo de enrolamiento
2. **CLASES** - Funcionalidad futura

### Componente MenuButton

```jsx
const MenuButton = ({ iconPlaceholder, text, onClick }) => (
    <button className="menu-button" onClick={onClick}>
        <div className="icon-placeholder">
            <img src={iconPlaceholder} />
        </div>
        <span className="button-text">{text}</span>
    </button>
);
```

---

## Forms

**Archivo:** `src/Forms.js`

**Descripción:** Formulario completo de registro de datos personales.

### Campos del Formulario

#### Datos Personales
- `nombre` (text, requerido)
- `apellido` (text, requerido)
- `dni` (text, requerido)
- `fechaNacimiento` (date, requerido)
- `email` (email)
- `telefono` (tel)

#### Demografía
- `sexo` (select): femenino, masculino, noindica
- `genero` (select): cisgenero, transgenero, intersexual, nobinario
- `etnia` (select): qom, pilagá, mocoví, wichí, etc.
- `nfamilia` (number): número de integrantes de familia

#### Educación
- `nivelEscolar` (select): primaria, secundaria, universitario, posgrado

#### Ubicación
- `zona` (text, requerido)
- `provincia` (text, requerido)

#### Producción (Checkboxes múltiples)
- apicultura, bovino, avícola, caprino, porcino, ovino, agrofloresta, leña, carbonero, algarroba, otros
- `productorOtro` (text, cuando se selecciona "otros")

#### Nivel de Producción
- `nivel` (select): inicial, intermedio, experto
- `superficiePredio` (number, m²)
- `superficieProductiva` (number, m²)

#### Capacitación (Checkboxes múltiples)
- Mismas opciones que producción
- `interesCapacitacionOtro` (text, cuando se selecciona "otros")

### Props

```javascript
Forms.propTypes = {
    cerrarForm: PropTypes.func.isRequired,     // Función para cerrar formulario
    onAddPerson: PropTypes.func,               // Función callback al agregar persona
    data: PropTypes.shape({
        imagenSelfie: PropTypes.string,
        imagenDNI: PropTypes.string
    }),
    onFormCompleted: PropTypes.func            // Callback al completar formulario
}
```

### Funciones

#### `handleSubmit(e)`

Procesa el envío del formulario y crea el objeto persona.

```javascript
const handleSubmit = (e) => {
    e.preventDefault();
    
    const newPerson = {
        ...formData,
        id: Date.now(),
        helperData: localStorage.getItem('descriptor_b64'),
        hashIdentidad: localStorage.getItem('hashIdentidad'),
        offlineImageKey: data.imagenSelfie,
        offlineImageDNIKey: data.imagenDNI,
    };
    
    // Agregar a lista (delegado o local)
    onAddPerson ? onAddPerson(newPerson) : 
    setPeopleList(prev => [...prev, newPerson]);
};
```

---

## PeopleList

**Archivo:** `src/PeopleList.js`

**Descripción:** Componente que muestra la lista de personas registradas.

### Funcionalidad

- Lee la lista desde `localStorage.peopleList`
- Muestra cada persona con su información básica
- Incluye imagen de perfil
- Muestra contador total

### Estructura de Datos

```javascript
const person = {
    id: number,
    nombre: string,
    apellido: string,
    dni: string,
    fechaNacimiento: string,
    nivelEscolar: string,
    email: string,
    offlineImageKey: string,  // Clave para IndexedDB
    hashIdentidad: string,
    ipfsCID: string
}
```

### Renderizado

```jsx
{peopleList.map((person, index) => (
    <div key={person.id || index} className="list-item">
        <div className="person-main">
            <div className="person-name">
                {index + 1}. {person.nombre} {person.apellido}
            </div>
            <ImageDisplay 
                offlineImageKey={person.offlineImageKey}
                tamaño={{ width: 60, height: 60, radius: true }}
            />
        </div>
        <div className="person-meta">
            <div>📅 {person.fechaNacimiento}</div>
            <div>🎓 {person.nivelEscolar}</div>
            <div>📧 {person.email}</div>
            <div>DNI: {person.dni}</div>
        </div>
    </div>
))}
```

---

## ImageDisplay

**Archivo:** `src/ImageDisplay.js`

**Descripción:** Componente que muestra imágenes almacenadas en IndexedDB.

### Props

```javascript
ImageDisplay.propTypes = {
    offlineImageKey: PropTypes.string,      // Clave de la imagen en IndexedDB
    tamaño: PropTypes.shape({
        width: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        height: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        radius: PropTypes.bool              // Imagen circular
    })
}
```

### Funcionalidad

1. Carga la imagen desde IndexedDB usando `getImageObjectURL()`
2. Crea una URL de objeto temporal
3. Muestra la imagen con los estilos especificados
4. **Cleanup:** Revoca la URL de objeto al desmontar para liberar memoria

### Ejemplo de Uso

```jsx
<ImageDisplay 
    offlineImageKey="img-1234567890-abc123"
    tamaño={{ width: 200, height: 200, radius: true }}
/>
```

---

## LoadingSpinner

**Archivo:** `src/LoadingSpinner.js`

**Descripción:** Componente de carga con spinner animado.

### Props

```javascript
LoadingSpinner.propTypes = {
    message: PropTypes.string   // Mensaje a mostrar (default: "Cargando...")
}
```

### Renderizado

```jsx
<div className="loading-container">
    <div className="spinner"></div>
    <p className="loading-message">{message}</p>
</div>
```

### Uso

```jsx
{isLoading && <LoadingSpinner message="Subiendo a IPFS..." />}
```

---

## TransactionLogs

**Archivo:** `src/mobile/TransactionLogs.jsx`

**Descripción:** Componente que muestra el registro de una transacción blockchain.

### Props

```javascript
TransactionLogs.propTypes = {
    transactionData: PropTypes.shape({
        account: PropTypes.string,      // Dirección de la cuenta
        hash: PropTypes.string,         // Hash de la transacción
        blockHash: PropTypes.string,    // Hash del bloque
        block: PropTypes.string,        // Número de bloque
        status: PropTypes.string        // 'success' | 'error'
    })
}
```

### Funcionalidad

Muestra una lista de logs de la transacción con:

1. **Conexión a MetaMask** - Cuenta conectada
2. **Envío de transacción** - Hash de la transacción
3. **Confirmación** - Bloque donde se confirmó
4. **Resultado** - Estado final

### Enlaces Externos

Genera enlaces a Etherscan:
- **Transacción:** `https://sepolia.etherscan.io/tx/{hash}`
- **Cuenta:** `https://sepolia.etherscan.io/address/{account}`

### Renderizado

```jsx
const logs = [
    {
        id: 1,
        message: `Cuenta conectada: ${account}`,
        link: accountLink,
        label: "Ver Cuenta (Etherscan)"
    },
    {
        id: 2,
        message: "Enviando transacción...",
    },
    {
        id: 3,
        message: `Transacción enviada. Hash: ${hash}`,
        link: transactionLink,
        label: "Ver Transacción (Etherscan)"
    },
    {
        id: 4,
        message: `Confirmada en bloque: ${block}`,
        icon: '✅',
        status: 'success'
    }
];
```

---

## Hooks Personalizados

### useEffect para Carga de Modelos

```javascript
useEffect(() => {
    (async () => {
        try {
            await loadModels();
            setModelsLoaded(true);
            setMessage("Modelos cargados ✅");
        } catch (e) {
            console.error("Error cargando modelos:", e);
            setMessage("Error cargando modelos");
        }
    })();
}, []);
```

### useEffect para Cámara

```javascript
useEffect(() => {
    if (!modelsLoaded || !requiresCamera) return;
    
    const start = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
    };
    
    start();
    
    // Cleanup
    return () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
    };
}, [modelsLoaded, step]);
```

---

## Mejores Prácticas

1. **Siempre limpiar recursos** (cámara, URLs de objeto)
2. **Manejar estados de carga** apropiadamente
3. **Validar datos** antes de procesar
4. **Manejar errores** con try/catch y mensajes al usuario
5. **Usar PropTypes** para validación de props
6. **Evitar prop drilling** - usar context o estado global cuando sea necesario
