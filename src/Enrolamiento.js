import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    float32ArrayToBase64,
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    loadModels,
} from "./funciones/identityHash";
import Forms from "./Forms";

/**
 * Enrolamiento + Verificación (estilizado)
 * - Mantiene la lógica que tenías.
 * - Añade estilos embebidos para que se vea bien sin Tailwind.
 * - Acepta prop opcional onEnroll(newPersonObject) -> para que el padre actualice peopleList.
 */

export default function Enrolamiento({ onEnroll } = {}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");
    const [enrolled, setEnrolled] = useState(false);
    const [storedHash, setStoredHash] = useState(null);
    const [lastDistance, setLastDistance] = useState(null);
    const [formulario, setFormulario] = useState(false);

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

        // Save into localStorage (PoC)
        localStorage.setItem("descriptor_b64", b64);
        localStorage.setItem("hashIdentidad", hash);

        setEnrolled(true);
        setStoredHash(hash);

        // Si nos pasan onEnroll (función), construimos un objeto persona simple y lo enviamos
        if (typeof onEnroll === "function") {
            // construimos una persona mínima; el formulario puede completarla luego
            const newPerson = {
                nombre: "Sin Nombre",
                apellido: "Sin Apellido",
                sexo: "",
                dni: "",
                nivelEscolar: "",
                fechaNacimiento: "",
                email: "",
                telefono: "",
                id: Date.now(),
                helperData: b64,
                hashIdentidad: hash,
            };
            try {
                onEnroll(newPerson);
            } catch (e) {
                console.warn("onEnroll prop lanzó error:", e);
            }
        }

        alert("Enrolamiento completado.\nidentityHash: " + hash);
        setFormulario(true); // mostrar formulario después del enrolamiento
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

    const cerrarForm = () => {
        setFormulario(false);
    };

    return (
        <div className="enrol-root">
            <style>{`
        :root{
          --bg:#f7fafc; --card:#fff; --muted:#6b7280; --primary:#2563eb;
          --text:#0f172a;
        }
        .enrol-root{width:100%;max-width:1100px;margin:0 auto;padding:18px;font-family:Inter,Arial,Helvetica,sans-serif}
        .panel{display:flex;gap:20px;flex-wrap:wrap}
        .video-card, .info-card{background:var(--card);padding:16px;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,0.06)}
        .video-card{flex:1;min-width:280px}
        .info-card{flex:1;min-width:260px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
        button{background:var(--primary);color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-weight:700}
        button[disabled]{opacity:0.5;cursor:not-allowed}
        .controls{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
        .note{font-size:13px;color:var(--muted)}
        .title{font-size:20px;font-weight:800;margin-bottom:6px}
      `}</style>

            <h2 className="title">Enrolamiento y Verificación (PoC)</h2>
            <p className="note">{message}</p>

            {formulario ? (
                <div className="video-card">
                    <Forms cerrarForm={cerrarForm} />
                </div>
            ) : (
                <div className="panel">
                    <div className="video-card">
                        <video ref={videoRef} autoPlay muted style={{ width: "100%", borderRadius: 8, background: "#000" }} />
                        <div className="controls" style={{ marginTop: 12 }}>
                            <button onClick={handleEnroll} disabled={!modelsLoaded} style={{ marginRight: 8 }}>
                                Enrolar (capturar & guardar)
                            </button>
                            <button onClick={handleVerify} disabled={!modelsLoaded || !enrolled} style={{ marginRight: 8 }}>
                                Verificar ahora
                            </button>
                            <button onClick={handleClearEnrollment} style={{ background: "#ef4444" }}>
                                Borrar enrolamiento
                            </button>
                        </div>
                    </div>

                    <div className="info-card">
                        <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, border: "1px solid #eee" }} />
                        <div>
                            <div style={{ fontWeight: 700 }}>Estado enrolamiento:</div>
                            <div className="note">{enrolled ? "Sí" : "No"}</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>identityHash almacenado:</div>
                            <div className="note">{storedHash || "-"}</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Última distancia (matching):</div>
                            <div className="note">{lastDistance ? lastDistance.toFixed(4) : "-"}</div>
                        </div>
                        <div className="note">
                            Nota: el descriptor se guarda localmente (IndexedStorage/localStorage). En producción cifra antes de subir a IPFS.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
