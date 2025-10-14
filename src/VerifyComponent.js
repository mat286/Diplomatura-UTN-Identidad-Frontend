import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    float32ArrayToBase64,
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    loadModels,
    base64ToUint8Array,
} from "./funciones/identityHash";
import './VerifyComponent.css'

/**
 * VerifyComponent estilizado (sin dependencias CSS externas)
 *
 * Requisitos:
 * - modelos en /public/models
 * - peopleList en localStorage (array u object)
 *
 * Comportamiento:
 * - muestra lista de personas en localStorage
 * - permite seleccionar una y verificar con la cámara
 * - muestra resultado (matching + hash check)
 */

const MODELS_BASE = `${window.location.origin}/models`;

export default function VerifyComponent() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Cargando modelos...");
    const [people, setPeople] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [result, setResult] = useState(null);
    const [lastDistance, setLastDistance] = useState(null);

    // load models + people
    useEffect(() => {
        (async () => {
            try {
                setLoadingMessage("Cargando modelos (face-api)...");
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_BASE),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_BASE),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_BASE),
                ]);
                setModelsLoaded(true);
                setLoadingMessage("Modelos cargados ✅");
            } catch (e) {
                console.error("Error cargando modelos:", e);
                setLoadingMessage("Error cargando modelos. Revisa /models y consola.");
                setModelsLoaded(false);
            }
        })();
        loadPeopleFromStorage();
    }, []);

    function loadPeopleFromStorage() {
        try {
            const raw = localStorage.getItem("peopleList");
            if (!raw) {
                setPeople([]);
                return;
            }
            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            setPeople(arr);
            // if no selection, auto-select first
            if (arr.length > 0 && selectedIdx === null) setSelectedIdx(0);
        } catch (e) {
            console.error("peopleList no válido en localStorage:", e);
            setPeople([]);
        }
    }

    // camera control
    async function startCamera() {
        if (cameraOn) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            setCameraOn(true);
        } catch (e) {
            console.error("No se pudo iniciar cámara:", e);
            alert("No se pudo acceder a la cámara. Revisa permisos.");
        }
    }
    function stopCamera() {
        if (!videoRef.current || !videoRef.current.srcObject) return;
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        setCameraOn(false);
    }

    function drawVideoToCanvas() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // capture descriptor from canvas
    async function captureDescriptorFromCanvas() {
        drawVideoToCanvas();
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas vacío");
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!detection) throw new Error("No se detectó una cara");
        return detection.descriptor;
    }

    // verification logic
    async function handleVerify() {
        setResult(null);
        setLastDistance(null);

        if (selectedIdx === null) {
            alert("Seleccioná una persona de la lista.");
            return;
        }
        const person = people[selectedIdx];
        if (!person.helperData) {
            alert("La persona seleccionada no tiene helperData.");
            return;
        }
        try {
            if (!modelsLoaded) {
                alert("Modelos no cargados aún.");
                return;
            }
            if (!cameraOn) await startCamera();

            const currentDesc = await captureDescriptorFromCanvas();
            const templateFloat = base64ToFloat32Array(person.helperData);

            const dist = euclideanDistance(templateFloat, currentDesc);
            setLastDistance(dist);
            const tolerance = 0.6;
            const match = dist <= tolerance;

            let hashOk = null;
            if (person.hashIdentidad) {
                const tplBytes = base64ToUint8Array(person.helperData).buffer;
                const recomputedHash = await sha256HexFromBuffer(tplBytes);
                hashOk = recomputedHash.toLowerCase() === person.hashIdentidad.toLowerCase();
            }

            setResult({ success: match, distance: dist, tolerance, hashOk });
        } catch (e) {
            console.error("Error en verificación:", e);
            alert("Error durante la verificación: " + (e.message || e));
        }
    }

    // small helper to render person card
    function PersonRow({ p, i, active }) {
        return (
            <div
                className={`person-row ${active ? "active" : ""}`}
                onClick={() => setSelectedIdx(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" ? setSelectedIdx(i) : null)}
            >
                <div className="person-left">
                    <div className="person-name">{p.nombre} {p.apellido}</div>
                    <div className="person-dni">DNI: {p.dni || "-"}</div>
                </div>
                <div className="person-right">
                    <div className="hash-preview">{p.hashIdentidad ? p.hashIdentidad.slice(0, 12) + "..." : "-"}</div>
                    <input type="radio" checked={selectedIdx === i} onChange={() => setSelectedIdx(i)} />
                </div>
            </div>
        );
    }

    return (
        <div className="verify-root">
            <style>{`
        /* :root{
          --bg:#f6f8fb; --card:#ffffff; --muted:#6b7280; --accent:#0ea5a4; --primary:#2563eb;
        }
        .verify-root{font-family:Inter,Arial,Helvetica,sans-serif;padding:18px;max-width:1100px;margin:0 auto}
        .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .title{font-size:1.25rem;font-weight:800;color:#0f172a}
        .status{font-size:0.95rem;color:var(--muted)}
        .container{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}
        .left{width:360px;flex:0 0 360px}
        .people-list{background:var(--card);padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(2,6,23,0.06);max-height:520px;overflow:auto}
        .person-row{display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;border:1px solid #eef2f7;margin-bottom:8px;cursor:pointer;transition:transform .12s,box-shadow .12s}
        .person-row:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(2,6,23,0.06)}
        .person-row.active{background:linear-gradient(90deg,#f8fafc,#ffffff);border-color:#dbeafe}
        .person-left{display:flex;flex-direction:column}
        .person-name{font-weight:700}
        .person-dni{font-size:0.85rem;color:var(--muted)}
        .person-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
        .hash-preview{font-size:0.78rem;color:#9ca3af}
        .right{flex:1;min-width:320px;display:flex;flex-direction:column;gap:12px}
        .video-box{background:var(--card);padding:12px;border-radius:12px;box-shadow:0 8px 24px rgba(2,6,23,0.06)}
        video{width:100%;height:auto;border-radius:8px;background:#000}
        canvas{display:block;margin-top:8px;border-radius:8px;border:1px solid #eee;max-width:100%}
        .controls{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
        button{padding:8px 12px;border-radius:8px;border:none;cursor:pointer;font-weight:700;background:var(--primary);color:white}
        button.secondary{background:#64748b}
        button.negative{background:#ef4444}
        .result-card{background:linear-gradient(180deg,#fff,#fbfdff);padding:10px;border-radius:10px;border:1px solid #eef2f7}
        .result-ok{color:green;font-weight:800}
        .result-fail{color:#b91c1c;font-weight:800}
        .muted{color:var(--muted)}
        @media (max-width:900px){
          .container{flex-direction:column}
          .left{width:100%;flex:1}
        } */
      `}</style>

            <div className="header">
                <div>
                    <div className="title">Verificación biométrica</div>
                    <div className="status">{loadingMessage}</div>
                </div>
            </div>

            <div className="container">
                <div className="left">
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>Personas (local)</div>
                    <div className="people-list">
                        {people.length === 0 ? (
                            <div style={{ color: "#666", padding: 12 }}>
                                No hay personas en localStorage bajo la clave <code>peopleList</code>.
                                <div style={{ marginTop: 6, fontSize: 13 }}>Asegurate que el JSON está presente y tiene la propiedad <code>helperData</code>.</div>
                            </div>
                        ) : (
                            people.map((p, i) => (
                                <PersonRow key={p.id ?? i} p={p} i={i} active={selectedIdx === i} />
                            ))
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button className="secondary" onClick={loadPeopleFromStorage}>Refrescar</button>
                            <button className="negative" onClick={() => { localStorage.removeItem("peopleList"); loadPeopleFromStorage(); }}>Borrar lista</button>
                        </div>
                    </div>
                </div>

                <div className="right">
                    <div className="video-box">
                        <video ref={videoRef} autoPlay muted playsInline />
                        <canvas ref={canvasRef} />
                        <div className="controls">
                            <button onClick={startCamera} disabled={cameraOn}>Iniciar cámara</button>
                            <button className="secondary" onClick={stopCamera} disabled={!cameraOn}>Detener</button>
                            <button onClick={handleVerify}>Capturar y Verificar</button>
                        </div>
                    </div>

                    <div className="result-card">
                        <div style={{ fontWeight: 700 }}>Resultado</div>
                        {result ? (
                            <div style={{ marginTop: 8 }}>
                                <div>
                                    Matching (distance ≤ {result.tolerance}):{" "}
                                    <span className={result.success ? "result-ok" : "result-fail"}>
                                        {result.success ? "MATCH ✅" : "NO MATCH ❌"}
                                    </span>
                                </div>
                                <div style={{ marginTop: 6 }}>Distancia: <strong>{result.distance.toFixed(4)}</strong></div>
                                <div style={{ marginTop: 6 }}>Hash check: {result.hashOk === null ? <span className="muted">no disponible</span> : result.hashOk ? <span className="result-ok">OK ✅</span> : <span className="result-fail">NO COINCIDE ❌</span>}</div>
                            </div>
                        ) : (
                            <div style={{ color: "#666", marginTop: 8 }}>Aún no se realizó ninguna verificación</div>
                        )}
                        {lastDistance && <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>Última distancia: {lastDistance.toFixed(4)}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
