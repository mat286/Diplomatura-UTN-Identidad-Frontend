import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

function App() {
    const videoRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");

    // Carga los modelos desde /public/models
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                ]);
                setModelsLoaded(true);
                setMessage("Modelos cargados correctamente ✅");
            } catch (err) {
                console.error("Error cargando modelos:", err);
                setMessage("Error cargando modelos ❌");
            }
        };

        loadModels();
    }, []);

    // Inicia la cámara
    useEffect(() => {
        if (!modelsLoaded) return;
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                videoRef.current.srcObject = stream;
            })
            .catch((err) => console.error("Error accediendo a la cámara:", err));
    }, [modelsLoaded]);

    // Detecta el rostro al presionar el botón
    const handleCapture = async () => {
        if (!videoRef.current) return;
        const detections = await faceapi
            .detectAllFaces(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detections.length === 0) {
            alert("No se detectó ningún rostro 😕");
            return;
        }

        // Tomamos el primer rostro detectado
        const descriptor = detections[0].descriptor;

        // Generamos hash simple y helperData simulado
        const hash = await crypto.subtle.digest("SHA-256", descriptor);
        const hashHex = Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const helperData = btoa(JSON.stringify(descriptor.slice(0, 16))); // Ejemplo simple

        localStorage.setItem("hashIdentidad", hashHex);
        localStorage.setItem("helperData", helperData);

        alert("Datos biométricos guardados en localStorage ✅");
    };

    return (
        <div style={{ textAlign: "center", marginTop: 20 }}>
            <h1>Registro biométrico</h1>
            <p>{message}</p>
            <video ref={videoRef} autoPlay muted width="480" height="360" />
            <br />
            <button
                onClick={handleCapture}
                disabled={!modelsLoaded}
                style={{
                    marginTop: 20,
                    padding: "10px 20px",
                    fontSize: "16px",
                    cursor: "pointer",
                }}
            >
                Capturar rostro
            </button>
        </div>
    );
}

export default App;
