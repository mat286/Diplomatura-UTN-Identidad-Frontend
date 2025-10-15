import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    base64ToUint8Array,
} from "./funciones/identityHash";
import './VerifyComponent.css'
import { encryptAndPackage, decryptAndRetrieve, uploadToPinata } from "./funciones/encryptAndPackage";

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

    async function empaquetar() {

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


            // 1. Cifrar y empaquetar
            /* const { encryptedData, encryptionKey } = await encryptAndPackage(person.offlineImageDNIKey, person.offlineImageKey, person);
            console.log("Datos cifrados listos para subir."); */
            /* console.log(person); */

            /*  console.log(encryptedData, encryptionKey); */

            // 2. Subir a IPFS (Pinata)
            const { ipfsCid, encryptionKey } = await uploadToPinata(person);
            console.log("Subido a IPFS (Pinata) con CID:", ipfsCid);
            console.log("Calve:", encryptionKey);

            // 3. Descargar y descifrar (prueba)
            const dataposta = await decryptAndRetrieve(ipfsCid, encryptionKey);
            console.log(dataposta.images, dataposta.json);
            alert(`Proceso completado.\n\nCID en IPFS (Pinata): ${ipfsCid}\n\nRevisá consola para detalles.`);

            /* const dataposta = await decryptAndRetrieve(encryptedData, encryptionKey);
            console.log(dataposta.images, dataposta.json); */


        } catch (error) {
            console.error("Error en el proceso de subida:", error);
            alert(`Error: ${error.message}`);
        }
        if (selectedIdx === null) {
            alert("Seleccioná una persona de la lista.");
            return;
        }
    }

    return (
        <div className="verify-root">

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
                            <button className="secondary" onClick={() => empaquetar(/* file1, file2, metadata */)}>Empauetar</button>
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
