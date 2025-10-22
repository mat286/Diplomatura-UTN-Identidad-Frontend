import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    float32ArrayToBase64,
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    loadModels,
} from "../funciones/identityHash";
import Forms from "../Forms";
import { saveImageOffline } from "../funciones/offlineStore";
import './Enrolamiento2.css';
import { useNavigate } from "react-router-dom";

// Constantes para el estado de la UI de captura
const CAPTURE_STATUS = {
    CAPTURING: 'capturing', // Mostrando la cámara
    COMPLETE: 'complete',   // Mostrando la foto capturada y el check
};

export default function Enrolamiento() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // --> ESTADOS MODIFICADOS <--
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");
    const [enrolled, setEnrolled] = useState(false);
    const [storedHash, setStoredHash] = useState(null);
    const [formulario, setFormulario] = useState(false); // true = muestra Forms.js, false = muestra biometría
    const [captureStatus, setCaptureStatus] = useState(CAPTURE_STATUS.CAPTURING); // Estado de la biometría
    const [data, setData] = useState({ imagenDNI: null, imagenSelfie: null });
    const navigate = useNavigate();

    const handleLogin = (event) => {
        navigate(event);
    };

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

    // helper: capture frame to canvas (mantienes el código)
    function drawVideoFrameToCanvas() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // NUEVA FUNCIÓN: Inicia la captura y enrolamiento
    async function handleCapturePhoto() {
        if (!modelsLoaded) return alert("Modelos no cargados");
        setMessage("Detectando rostro...");

        drawVideoFrameToCanvas();
        const canvas = canvasRef.current;
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setMessage("No se detectó una cara. Intenta de nuevo.");
            return alert("No se detectó una cara. Asegurate de estar frente a la cámara.");
        }

        // --- Lógica de Enrolamiento (antes handleEnroll) ---
        const descriptor = detection.descriptor;
        const b64 = float32ArrayToBase64(descriptor);
        const hash = await sha256HexFromBuffer(descriptor.buffer);

        // Guardar imagen offline
        let offlineKey = null;
        try {
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            offlineKey = await saveImageOffline(imageBlob);
            setData(prevData => ({ ...prevData, imagenSelfie: offlineKey }));
        } catch (e) {
            console.error("Error al guardar la imagen offline:", e);
            setMessage("Error al guardar la imagen de muestra.");
            return alert("⚠️ Error crítico al guardar la imagen offline.");
        }

        // Guardar descriptor y hash (PoC)
        localStorage.setItem("descriptor_b64", b64);
        localStorage.setItem("hashIdentidad", hash);
        setEnrolled(true);
        setStoredHash(hash);

        // --- CAMBIO DE ESTADO ---
        setCaptureStatus(CAPTURE_STATUS.COMPLETE);
        setMessage("Foto capturada. Biometría registrada. ✅");
        // alert("Enrolamiento completado.\nidentityHash: " + hash);
    }

    // NUEVA FUNCIÓN: Vuelve al modo captura (para 'Tomar Otra Foto')
    const handleRecapture = () => {
        setCaptureStatus(CAPTURE_STATUS.CAPTURING);
        setMessage("Modelos cargados ✅");
        // Opcional: limpiar los datos de la captura anterior si es necesario
        setData(prevData => ({ ...prevData, imagenSelfie: null }));
    }

    // NUEVA FUNCIÓN: Continúa al formulario
    const handleContinueToForm = () => {
        if (captureStatus === CAPTURE_STATUS.COMPLETE && data.imagenSelfie) {
            setFormulario(true); // Cambia al componente Forms
            setMessage("Continuando al formulario...");
        } else {
            alert("Primero debes capturar tu foto de biometría.");
        }
    }














    // borrar enrolamiento (debug)
    function handleClearEnrollment(alerta = false) {
        localStorage.removeItem("descriptor_b64");
        localStorage.removeItem("hashIdentidad");
        setEnrolled(false);
        setStoredHash(null);
        /* setLastDistance(null); */
        if (alerta) alert("Enrolamiento borrado localmente.");
    }

    const cerrarForm = () => {
        setFormulario(false);
        handleClearEnrollment();
        setData({});
    };

    return (
        <div className="enrol-root">
            {/* Solo muestra el mensaje de carga/estado en el root */}
            {/* <h2 className="title">Enrolamiento y Verificación (PoC)</h2> */}
            {/* <p className="note">{message}</p> */}

            {/* Renderizar Forms.js si el estado es 'formulario' */}
            {formulario ? (
                <div className="video-card">
                    <Forms cerrarForm={cerrarForm} data={data} />
                </div>
            ) : (
                // Renderizar la interfaz de biometría (Capturando o Completa)
                <div className="video-card">

                    {/* Caja de Instrucciones */}
                    <div className="instructions-box">
                        <span>{enrolled ? "🔒" : "📸"}</span>
                        Asegúrese de estar en un lugar bien iluminado y que su rostro sea completamente visible.
                    </div>

                    {/* Área de Captura (Cámara o Check) */}
                    <div className="capture-area">
                        {captureStatus === CAPTURE_STATUS.COMPLETE ? (
                            // **VISTA DE FOTO CAPTURADA**
                            <>
                                <div className="capture-icon-container completed">
                                    ✓
                                </div>
                                <p className="capture-text">
                                    Foto capturada <br /> Biometría registrada
                                </p>
                            </>
                        ) : (
                            // **VISTA DE CAPTURANDO (Cámara)**
                            // Mantenemos el video ref aquí para que la cámara siga activa
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                className="video-preview"
                                style={{
                                    opacity: modelsLoaded ? 1 : 0,
                                    transition: 'opacity 0.5s',
                                    /* Simulamos el círculo con un borde/máscara si es necesario, 
                                       pero por ahora mostramos el video completo en el área */
                                }}
                            />
                            // Opcional: mostrar un ícono de cámara estático si el video no debe renderizar
                            // <div className="capture-icon-container">
                            //     📷
                            // </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    {/* BOTONES */}
                    <div style={{ width: '100%' }}>
                        {captureStatus === CAPTURE_STATUS.COMPLETE ? (
                            // **Botones de Foto Capturada**
                            <>
                                <button className="btn-recapture" onClick={handleRecapture}>
                                    <span style={{ marginRight: '8px', fontSize: '1.2em' }}>↻</span> TOMAR OTRA FOTO
                                </button>
                                <button className="btn-primary" onClick={handleContinueToForm} disabled={!data.imagenSelfie}>
                                    CONTINUAR
                                </button>
                            </>
                        ) : (
                            // **Botón de Capturar Foto**
                            <button className="btn-capture" onClick={handleCapturePhoto} disabled={!modelsLoaded}>
                                <span style={{ marginRight: '8px', fontSize: '1.2em' }}>📸</span> CAPTURAR FOTO
                            </button>
                        )}

                        {/* Botón ATRÁS, siempre visible (excepto en el Form) */}
                        <button className="btn-secondary" onClick={() => handleLogin(-1)}>
                            ATRÁS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
