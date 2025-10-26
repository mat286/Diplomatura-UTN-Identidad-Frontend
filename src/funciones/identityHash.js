import * as faceapi from "face-api.js";

/*
App.jsx — Enrolamiento y Verificación facial (face-api.js)
- Requisitos: modelos en /public/models
- Usa descriptor (Float32Array) -> lo guarda en localStorage (base64) y calcula hash (SHA-256).
- Verificación: compara distancia euclidiana entre descriptores.
*/


function uint8ArrayToBase64(u8) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
        const slice = u8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
}
function base64ToUint8Array(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}
function float32ArrayToBase64(f32) {
    // reinterpret as Uint8Array
    return uint8ArrayToBase64(new Uint8Array(f32.buffer));
}
function base64ToFloat32Array(b64) {
    const u8 = base64ToUint8Array(b64);
    return new Float32Array(u8.buffer);
}
function arrayBufferToHex(buffer) {
    const u8 = new Uint8Array(buffer);
    return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256HexFromBuffer(buffer) {
    const h = await crypto.subtle.digest("SHA-256", buffer);
    return "0x" + arrayBufferToHex(h);
}
function euclideanDistance(a, b) {
    if (a.length !== b.length) throw new Error("length mismatch");
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}

async function loadModels() {
    const MODEL_URL = `${window.location.origin}/models`;
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
}

export { base64ToUint8Array, float32ArrayToBase64, base64ToFloat32Array, sha256HexFromBuffer, euclideanDistance, loadModels }