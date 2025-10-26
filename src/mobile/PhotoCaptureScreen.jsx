import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    float32ArrayToBase64,
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    loadModels,
} from "../funciones/identityHash";
import { saveImageOffline } from "../funciones/offlineStore";
import './PhotoCaptureScreen.css';
import { useNavigate } from 'react-router-dom';
import Forms from "../Forms";
import PhotoCaptureUI from "./PhotoCaptureUI";

const PhotoCaptureScreen = () => {

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");
    const [enrolled, setEnrolled] = useState(false);
    const [storedHash, setStoredHash] = useState(null);
    const [lastDistance, setLastDistance] = useState(null);
    const [formulario, setFormulario] = useState(false);
    const [data, setData] = useState({ imagenDNI: null, imagenSelfie: null });
    const [isCaptured, setIsCaptured] = useState(false);

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

        //CAPTURAR Y GUARDAR IMAGEN DE MUESTRA OFFLINE (¡NUEVO!)
        let offlineKey = null;
        try {
            // Convierte el canvas (que ya tiene la foto de la muestra) a un Blob
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            // Guarda el Blob en IndexedDB y obtén la clave
            offlineKey = await saveImageOffline(imageBlob);
            setData(prevData => ({
                ...prevData,
                imagenSelfie: offlineKey,
            }));

        } catch (e) {
            console.error("Error al capturar/guardar la imagen offline:", e);
            alert("⚠️ Error crítico al guardar la imagen de la muestra offline. Enrolamiento cancelado.");
            return;
        }


        // Save into localStorage (PoC)
        localStorage.setItem("descriptor_b64", b64);
        localStorage.setItem("hashIdentidad", hash);

        setEnrolled(true);
        setStoredHash(hash);
        setIsCaptured(true)

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
        //CAPTURAR Y GUARDAR IMAGEN DE MUESTRA OFFLINE (¡NUEVO!)
        if (ok) {
            let offlineKey = null;
            try {
                // Convierte el canvas (que ya tiene la foto de la muestra) a un Blob
                const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

                // Guarda el Blob en IndexedDB y obtén la clave
                offlineKey = await saveImageOffline(imageBlob);
                setData(prevData => ({
                    ...prevData,
                    imagenDNI: offlineKey,
                }));
                setFormulario(true);
            } catch (e) {
                console.error("Error al capturar/guardar la imagen offline:", e);
                alert("⚠️ Error crítico al guardar la imagen de la muestra offline. Enrolamiento cancelado.");
                return;
            }
        }
    }

    async function handleCaptureAction() {
        if (!enrolled) {
            await handleEnroll(); // Si no está enrolado, lo enrolamos
        } else {
            await handleVerify(); // Si ya está enrolado, verificamos
        }
    }

    // borrar enrolamiento (debug)
    function handleClearEnrollment(alerta = false) {
        localStorage.removeItem("descriptor_b64");
        localStorage.removeItem("hashIdentidad");
        setEnrolled(false);
        setStoredHash(null);
        setLastDistance(null);
        if (alerta) alert("Enrolamiento borrado localmente.");
    }

    const cerrarForm = () => {
        setFormulario(false);
        handleClearEnrollment();
        setData({});
    };

    const handleRecapture = () => {
        setIsCaptured(false); // Vuelve a la vista de cámara
        // Opcional: handleClearEnrollment(false); si quieres borrar la biometría capturada
    };

    return (
        <>
            {
                formulario ? (
                    <Forms cerrarForm={cerrarForm} data={data} />
                ) : (
                    <PhotoCaptureUI
                        // Refs para la cámara
                        videoRef={videoRef}
                        canvasRef={canvasRef}

                        // Lógica del botón de captura
                        onCapture={handleCaptureAction}
                        captureDisabled={!modelsLoaded}

                        // Navegación (recibida como props)
                        onContinue={() => handleLogin()}
                        onBack={() => handleLogin(-1)}

                        // Mensaje de estado (opcional)
                        message={!modelsLoaded ? message : (videoRef.current?.srcObject ? null : message)
                        }

                        isCaptured={isCaptured} // <--- Pasar estado
                        onRecapture={handleRecapture} // <--- Pasar handler
                    /* onContinue={() => onContinue()} */
                    />
                )}
        </>
    );
};

/* export default PhotoCaptureScreen; */