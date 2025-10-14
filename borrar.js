// La cadena de texto original
const textoOriginal = "React";

// ==========================================================
// PASO 1: Convertir el texto a datos binarios (representación de bytes)
// ==========================================================
// En un entorno moderno (navegador o Node.js), esto se hace
// usando la API TextEncoder para obtener un Uint8Array (bytes).

const encoder = new TextEncoder();
const bytes = encoder.encode(textoOriginal);

console.log(`Texto Original: "${textoOriginal}"`);
console.log(`Representación Binaria (Uint8Array de bytes):`);
console.log(bytes);
// Ejemplo de salida: Uint8Array(5) [82, 101, 97, 99, 116] 
// (Estos son los valores ASCII/UTF-8 de R, e, a, c, t)

// Nota: El valor binario real (bits) de 'R' (82) es 01010010,
// pero JavaScript maneja esto internamente como un ArrayBuffer.

// ==========================================================
// PASO 2: Codificar los bytes binarios a Base64
// ==========================================================

// En JavaScript de navegador, el método más directo para codificar
// un Array de bytes a Base64 es usando las funciones btoa() y atob().
// Sin embargo, btoa() solo funciona con caracteres latinos.

// Para manejar cualquier byte (UTF-8), se usa un truco:
// 1. Convertir el Uint8Array a una cadena binaria "raw".
// 2. Usar btoa() en esa cadena.

function bytesToBase64(bytes) {
    // 1. Convertir los bytes (Uint8Array) a una cadena binaria "raw"
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    // 2. Usar btoa() para codificar la cadena binaria a Base64
    return btoa(binary);
}

const base64Resultado = bytesToBase64(bytes);

console.log('\n==========================================================');
console.log(`Resultado en Base64: ${base64Resultado}`);
// Salida esperada para "React": UmVhY3Q=

// ==========================================================
// PASO 3: Decodificar (Verificación)
// ==========================================================
const encoder2 = new TextEncoder();
const bytes2 = encoder.encode(base64Resultado);
console.log(`Texto Original: "${base64Resultado}"`);
console.log(`Representación Binaria (Uint8Array de bytes):`);
console.log(bytes2);
const resultdo = bytesToBase64(bytes2);
console.log('\n==========================================================');
console.log(`Resultado en resultado: ${resultdo}`);
// Para verificar, decodificamos el Base64 de nuevo a texto.

function base64ToText(base64) {
    // 1. Decodificar la cadena Base64 a su cadena binaria "raw"
    const binary = atob(base64);

    // 2. Usar TextDecoder para convertir la cadena binaria de vuelta a texto
    const decoder = new TextDecoder();

    // Crear un Uint8Array a partir de la cadena binaria
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    // Decodificar los bytes a texto
    return decoder.decode(bytes);
}

const textoDecodificado = base64ToText(base64Resultado);
console.log(`Texto Decodificado: ${textoDecodificado}`);





















































// ENROLAMIENTO: captura descriptor y lo guarda
async function handleEnroll() {
    if (!modelsLoaded) return alert("Modelos no cargados");
    drawVideoFrameToCanvas();
    const canvas = canvasRef.current;

    const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
    if (!detection) return alert("No se detectó una cara. Asegurate de estar frente a la cámara.");

    // 1. OBTENER DESCRIPTOR Y HASH (Lógica existente)
    const descriptor = detection.descriptor; // Float32Array
    const b64 = float32ArrayToBase64(descriptor);
    const hash = await sha256HexFromBuffer(descriptor.buffer);

    // 2. CAPTURAR Y GUARDAR IMAGEN DE MUESTRA OFFLINE (¡NUEVO!)
    let offlineKey = null;
    try {
        // Convierte el canvas (que ya tiene la foto de la muestra) a un Blob
        const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // Guarda el Blob en IndexedDB y obtén la clave
        offlineKey = await saveImageOffline(imageBlob);

    } catch (e) {
        console.error("Error al capturar/guardar la imagen offline:", e);
        alert("⚠️ Error crítico al guardar la imagen de la muestra offline. Enrolamiento cancelado.");
        return;
    }

    // 3. GUARDAR DATOS LOCALMENTE (PoC)
    localStorage.setItem("descriptor_b64", b64);
    localStorage.setItem("hashIdentidad", hash);

    setEnrolled(true);
    setStoredHash(hash);

    // 4. ACTUALIZAR EL OBJETO DE LA PERSONA CON LA CLAVE OFFLINE
    if (typeof onEnroll === "function") {
        const newPerson = {
            nombre: "Sin Nombre",
            apellido: "Sin Apellido",
            // ...otros campos
            id: Date.now(),
            helperData: b64,
            hashIdentidad: hash,
            // ¡Añade la clave offline! Esto se usará para la subida asíncrona.
            offlineImageKey: offlineKey,
            imageCID: null, // El CID todavía es nulo
            status: 'pending_ipfs', // Indicador de que falta subir a IPFS
        };
        try {
            // Envía el objeto newPerson (con la clave offline) a la lista principal
            onEnroll(newPerson);
        } catch (e) {
            console.warn("onEnroll prop lanzó error:", e);
        }
    }

    alert(`Enrolamiento completado y guardado offline.\nidentityHash: ${hash}\nClave offline: ${offlineKey}`);
    setFormulario(true); // mostrar formulario después del enrolamiento
}



