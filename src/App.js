import React, { useEffect, useRef, useState } from "react";
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
/* async function loadModels() {
    const MODELS_BASE = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_BASE),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_BASE),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_BASE),
    ]);
} */

export default function App() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");
    const [enrolled, setEnrolled] = useState(false);
    const [storedHash, setStoredHash] = useState(null);
    const [lastDistance, setLastDistance] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                await loadModels();
                setModelsLoaded(true);
                setMessage("Modelos cargados ✅");
                // check existing enrollment
                const saved = localStorage.getItem("descriptor_b64");
                const h = localStorage.getItem("hashIdentidad");
                if (saved && h) {
                    setEnrolled(true);
                    setStoredHash(h);
                }
            } catch (e) {
                console.error("Error cargando modelos:", e);
                setMessage("Error cargando modelos");
            }
        })();
    }, []);

    // start camera when models loaded
    useEffect(() => {
        if (!modelsLoaded) return;
        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (e) {
                console.error("No se pudo acceder a la cámara:", e);
                setMessage("Permiso de cámara rechazado o no disponible");
            }
        };
        start();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach((t) => t.stop());
            }
        };
    }, [modelsLoaded]);

    // helper: capture frame to canvas
    function drawVideoFrameToCanvas() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

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

        const descriptor = detection.descriptor; // Float32Array
        // store descriptor as base64
        const b64 = float32ArrayToBase64(descriptor);
        // compute hash of raw buffer
        const hash = await sha256HexFromBuffer(descriptor.buffer);

        localStorage.setItem("descriptor_b64", b64);
        localStorage.setItem("hashIdentidad", hash);
        setEnrolled(true);
        setStoredHash(hash);
        alert("Enrolamiento completado.\nidentityHash: " + hash);
    }

    // VERIFICACIÓN: captura nueva muestra y compara con guardada
    async function handleVerify() {
        if (!modelsLoaded) return alert("Modelos no cargados");
        const b64 = localStorage.getItem("descriptor_b64");
        if (!b64) return alert("No hay enrolamiento guardado. Primero realiza el enrolamiento.");

        drawVideoFrameToCanvas();
        const canvas = canvasRef.current;
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!detection) return alert("No se detectó una cara para verificar.");

        const newDesc = detection.descriptor; // Float32Array
        const storedFloat = base64ToFloat32Array(b64);

        // matching
        const dist = euclideanDistance(storedFloat, newDesc);
        setLastDistance(dist);

        const tolerance = 0.5; // ajusta según pruebas
        const ok = dist <= tolerance;

        // crypto check: recompute hash of stored descriptor and compare with storedHash
        const recomputedHash = await sha256HexFromBuffer(storedFloat.buffer);
        const storedHashLocal = localStorage.getItem("hashIdentidad");

        let msg = `Matching result: ${ok ? "MATCH ✅" : "NO MATCH ❌"} (distance=${dist.toFixed(4)}, tol=${tolerance})\n`;
        msg += `Stored identityHash: ${storedHashLocal}\nRecomputed hash: ${recomputedHash}\n`;
        alert(msg);
    }

    // borrar enrolamiento (debug)
    function handleClearEnrollment() {
        localStorage.removeItem("descriptor_b64");
        localStorage.removeItem("hashIdentidad");
        setEnrolled(false);
        setStoredHash(null);
        setLastDistance(null);
        alert("Enrolamiento borrado localmente.");
    }

    return (
        <div style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
            <h1>Enrolamiento y Verificación (PoC)</h1>
            <p>{message}</p>

            <div style={{ display: "flex", gap: 20 }}>
                <div>
                    <video ref={videoRef} autoPlay muted style={{ width: 480, height: 360, background: "#000" }} />
                    <div style={{ marginTop: 8 }}>
                        <button onClick={handleEnroll} disabled={!modelsLoaded} style={{ marginRight: 8 }}>
                            Enrolar (capturar & guardar)
                        </button>
                        <button onClick={handleVerify} disabled={!modelsLoaded || !enrolled} style={{ marginRight: 8 }}>
                            Verificar ahora
                        </button>
                        <button onClick={handleClearEnrollment}>Borrar enrolamiento</button>
                    </div>
                </div>

                <div>
                    <canvas ref={canvasRef} style={{ border: "1px solid #ddd", display: "block", maxWidth: 480 }} />
                    <div style={{ marginTop: 12 }}>
                        <div><strong>Estado enrolamiento:</strong> {enrolled ? "Sí" : "No"}</div>
                        <div style={{ marginTop: 6 }}><strong>identityHash almacenado:</strong> {storedHash || "-"}</div>
                        <div style={{ marginTop: 6 }}><strong>Última distancia (matching):</strong> {lastDistance ? lastDistance.toFixed(4) : "-"}</div>
                        <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
                            Nota: el descriptor se guarda localmente (IndexedStorage/localStorage). En producción cifrar antes de subir a IPFS.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
