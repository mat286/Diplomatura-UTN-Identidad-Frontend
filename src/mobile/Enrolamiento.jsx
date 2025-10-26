import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
    float32ArrayToBase64,
    base64ToFloat32Array,
    sha256HexFromBuffer,
    euclideanDistance,
    loadModels,
} from "../funciones/identityHash";

import { DeleteImageOffline, saveImageOffline } from "../funciones/offlineStore";
import { decryptAndRetrieve, uploadToPinata } from "../funciones/encryptAndPackage";
import { crearIdentidad } from "../funciones/sendContractTransaction";

import Forms from "../Forms";
import LoadingSpinner from '../LoadingSpinner';
import TransactionLogs from "./TransactionLogs";

import './Enrolamiento2.css';

// --- CONSTANTES DEL FLUJO ---
const CAPTURE_STATUS = {
    CAPTURING: 'capturing',
    COMPLETE: 'complete',
};

const FLOW_STEPS = {
    BIOMETRIC_SELFIE: 'biometric_selfie',         // 1. Captura de Selfie
    SELFIE_COMPLETE: 'selfie_complete',           // 2. Selfie tomada (Listo para DNI)
    DNI_CAPTURE: 'dni_capture',                   // 3. Captura de DNI
    DNI_COMPLETE: 'dni_complete',                 // 4. Foto de DNI aceptada
    FINGERPRINT: 'fingerprint',                   // 5. Captura de Huella
    FINGERPRINT_COMPLETE: 'fingerprint_complete', // 6. Huella aceptada (listo para Form)
    FORM: 'form',                                 // 7. Formulario 
    FINAL_SAVED: 'final_saved',                   // 8. Proceso Terminado
    RESULTADO_FINAL: 'resultado_final',           // 9. Resultado final (éxito)
}

export default function Enrolamiento() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // --- ESTADOS ---
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState("Cargando modelos...");
    const [enrolled, setEnrolled] = useState(false);
    const [storedHash, setStoredHash] = useState(null);

    const [step, setStep] = useState(FLOW_STEPS.BIOMETRIC_SELFIE);
    const [captureStatus, setCaptureStatus] = useState(CAPTURE_STATUS.CAPTURING);

    const [isLoading, setIsLoading] = useState(false);

    const [dniImageKey, setDniImageKey] = useState(null);

    const [data, setData] = useState({
        imagenSelfie: null,
        imagenDNI: null,
        formData: {}
    });
    const [transactionData, setTransactionData] = useState({});

    // 1. Carga de modelos
    useEffect(() => {
        (async () => {
            try {
                await loadModels();
                setModelsLoaded(true);
                setMessage("Modelos cargados ✅");

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

    // 2. Inicio y detención de la cámara
    useEffect(() => {
        const requiresCamera =
            step === FLOW_STEPS.BIOMETRIC_SELFIE ||
            step === FLOW_STEPS.SELFIE_COMPLETE ||
            step === FLOW_STEPS.DNI_CAPTURE ||
            step === FLOW_STEPS.DNI_COMPLETE;

        if (!modelsLoaded || !requiresCamera) {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach((t) => t.stop());
                videoRef.current.srcObject = null;
            }
            return;
        }

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
    }, [modelsLoaded, step]);

    // --- HELPERS Y LÓGICA DE NEGOCIO ---
    function drawVideoFrameToCanvas() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Función de REINICIO COMPLETO
    function handleClearEnrollment(alerta = false) {
        localStorage.removeItem("descriptor_b64");
        localStorage.removeItem("hashIdentidad");
        setEnrolled(false);
        setStoredHash(null);
        DeleteImageOffline(data.imagenSelfie);
        DeleteImageOffline(data.imagenDNI);
        setStep(FLOW_STEPS.BIOMETRIC_SELFIE);
        setData({ imagenSelfie: null, imagenDNI: null, formData: {} });
        setDniImageKey(null);
        setCaptureStatus(CAPTURE_STATUS.CAPTURING); // Volver a modo cámara
        setMessage("Modelos cargados ✅. Listo para nuevo enrolamiento.");
        if (alerta) updatePeopleList(null, data.formData); // guarsa los datos previos de forma local
        if (alerta) alert("Flujo de enrolamiento reiniciado.");
    }

    // Función para manejar el cierre/cancelación del formulario
    const cerrarForm = () => {
        handleClearEnrollment(true);
    };

    // --- CAPTURA DE SELFIE BIOMÉTRICA (BIOMETRIC_SELFIE) ---
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

        const descriptor = detection.descriptor;
        const b64 = float32ArrayToBase64(descriptor);
        const hash = await sha256HexFromBuffer(descriptor.buffer);

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

        localStorage.setItem("descriptor_b64", b64);
        localStorage.setItem("hashIdentidad", hash);
        setEnrolled(true);
        setStoredHash(hash);

        setCaptureStatus(CAPTURE_STATUS.COMPLETE);
        setStep(FLOW_STEPS.SELFIE_COMPLETE);
        setMessage("Foto capturada. Biometría registrada. ✅");
    }

    const handleRecaptureSelfie = () => {
        setCaptureStatus(CAPTURE_STATUS.CAPTURING);
        setStep(FLOW_STEPS.BIOMETRIC_SELFIE);
        setData(prevData => ({ ...prevData, imagenSelfie: null }));
        setMessage("Listo para capturar la selfie.");
    }

    const handleContinueToDni = () => {
        if (data.imagenSelfie) {
            setStep(FLOW_STEPS.DNI_CAPTURE);
            setCaptureStatus(CAPTURE_STATUS.CAPTURING);
            setMessage("Listo para capturar la foto del DNI.");
        } else {
            alert("Primero debes capturar tu foto de biometría.");
        }
    }

    // --- CAPTURA DNI (DNI_CAPTURE) ---
    async function handleDniCapture() {
        if (!modelsLoaded) return alert("Modelos no cargados");
        setMessage("Capturando DNI y validando rostro...");

        drawVideoFrameToCanvas();
        const canvas = canvasRef.current;
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setMessage("No se detectó rostro en el DNI. Intente de nuevo.");
            return alert("No se detectó rostro en el DNI.");
        }

        const newDesc = detection.descriptor;
        const b64 = localStorage.getItem("descriptor_b64");

        if (!b64) {
            setMessage("Error: Selfie biométrica no encontrada para verificación.");
            return;
        }

        const storedFloat = base64ToFloat32Array(b64);
        const dist = euclideanDistance(storedFloat, newDesc);

        const tolerance = 0.5;
        const ok = dist <= tolerance;

        if (!ok) {
            setMessage(`¡Verificación fallida! El rostro en el DNI no coincide con la selfie. Distancia: ${dist.toFixed(4)}`);
            return alert("Verificación de identidad fallida. Los rostros no coinciden.");
        }

        let offlineKey = null;
        try {
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            offlineKey = await saveImageOffline(imageBlob);
            setDniImageKey(offlineKey);
            setData(prevData => ({ ...prevData, imagenDNI: offlineKey }));
        } catch (e) {
            console.error("Error al guardar la imagen del DNI offline:", e);
            setMessage("Error al guardar la imagen del DNI.");
            return alert("⚠️ Error crítico al guardar la imagen del DNI offline.");
        }

        setMessage("DNI capturado y rostro verificado. ✅");
        setCaptureStatus(CAPTURE_STATUS.COMPLETE);
        setStep(FLOW_STEPS.DNI_COMPLETE);
    }

    const handleRecaptureDni = () => {
        setCaptureStatus(CAPTURE_STATUS.CAPTURING);
        setStep(FLOW_STEPS.DNI_CAPTURE);
        setDniImageKey(null);
        setData(prevData => ({ ...prevData, imagenDNI: null }));
        setMessage("Listo para capturar el DNI.");
    }

    const handleContinueToFingerprint = () => {
        if (dniImageKey) {
            setStep(FLOW_STEPS.FINGERPRINT);
            setMessage("Ingrese su huella digital.");
        } else {
            alert("Primero debe capturar la foto del DNI.");
        }
    }


    // --- HUELLA DIGITAL (FINGERPRINT) ---
    const handleFingerprintCapture = () => {
        setStep(FLOW_STEPS.FINGERPRINT_COMPLETE);
        setMessage("¡Todas las huellas registradas! ✅");

    }

    const handleContinueToForm = () => {
        setStep(FLOW_STEPS.FORM);
        setMessage("Completando formulario...");
    }


    // --- FORMULARIO (FORM) ---
    const handleFormCompleted = (formData) => {
        setData(prevData => ({ ...prevData, formData: formData }));
        setStep(FLOW_STEPS.FINAL_SAVED);
        setMessage("¡Registro Completo!");
    }

    const updatePeopleList = (ipfsCid, person) => {
        if (!person) {
            console.error("Los datos de persona o ipfsCid son incompletos.");
            return JSON.parse(savedPeople) || [];
        }
        const savedPeople = localStorage.getItem('peopleList');
        try {
            const lista = savedPeople ? JSON.parse(savedPeople) : [];
            lista.push({
                apellido: person.apellido,
                nombre: person.nombre,
                fechaNacimiento: person.fechaNacimiento,
                dni: person.dni,
                helperData: person.helperData,
                hashIdentidad: person.hashIdentidad,
                ipfsCID: ipfsCid,
            });
            localStorage.setItem('peopleList', JSON.stringify(lista));
            return lista;
        } catch (error) {
            console.error("Error al parsear 'peopleList' del Local Storage:", error);
            return [];
        }
    };

    async function empaquetar() {

        if (data === null) {
            alert("Problema con la informacion.");
            return;
        }
        const person = data.formData;
        if (!person.helperData) {
            alert("La persona seleccionada no tiene helperData.");
            return;
        }
        setIsLoading(true);
        try {

            // Subir a IPFS (Pinata)
            const { ipfsCid, encryptionKey } = await uploadToPinata(person);
            console.log("Subido a IPFS (Pinata) con CID:", ipfsCid);
            console.log("Calve:", encryptionKey);

            // Descargar y descifrar
            const dataposta = await decryptAndRetrieve(ipfsCid, encryptionKey);
            console.log(dataposta.images, dataposta.json);
            alert(`Proceso completado.\n\nCID en IPFS (Pinata): ${ipfsCid}\n\nRevisá consola para detalles.`);

            const result = await crearIdentidad(person.hashIdentidad, ipfsCid);
            if (result.success === false) {
                setIsLoading(false);
                console.log(updatePeopleList(ipfsCid, person));
                handleClearEnrollment(false);
            } else {
                console.log("Identidad creada en blockchain con éxito.");
                setTransactionData({
                    account: result.from || "0x0",
                    hash: result.hash || "0x0",
                    blockHash: result.blockHash || "0",
                    block: result.blockNumber || "0",
                    status: result.success ? "success" : "error"
                });
                console.log(result);
                setStep(FLOW_STEPS.RESULTADO_FINAL);
            }

            setIsLoading(false);

        } catch (error) {
            setIsLoading(false);
            console.error("Error en el proceso de subida:", error);
            alert(`Error: ${error.message}`);
        }
    }



    // ------------------------------------------------------ RENDERS DE VISTA -----------------------------------------------
    const renderSelfieCapture = () => (
        <div className="video-card">
            <div className="instructions-box">
                <span>📸</span> Por favor, toma una **foto** para la biometría. (Paso 1 de 3)
            </div>

            <div className="capture-area">
                {step === FLOW_STEPS.SELFIE_COMPLETE ? (
                    <>
                        <div className="capture-icon-container completed">✓</div>
                        <p className="capture-text">Foto capturada <br /> Biometría registrada</p>
                    </>
                ) : (
                    <video ref={videoRef} autoPlay muted className="video-preview" style={{ opacity: modelsLoaded ? 1 : 0 }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ width: '100%' }}>
                {step === FLOW_STEPS.SELFIE_COMPLETE ? (
                    <>
                        <button className="btn-recapture" onClick={handleRecaptureSelfie}>
                            <span style={{ marginRight: '8px', fontSize: '1.2em' }}>↻</span> TOMAR OTRA FOTO
                        </button>
                        <button className="btn-primary" onClick={handleContinueToDni} disabled={!data.imagenSelfie}>
                            CONTINUAR AL DNI
                        </button>
                    </>
                ) : (
                    <button className="btn-capture" onClick={handleCapturePhoto} disabled={!modelsLoaded}>
                        <span style={{ marginRight: '8px', fontSize: '1.2em' }}>📸</span> CAPTURAR FOTO
                    </button>
                )}
            </div>
        </div>
    );

    const renderDniCapture = () => (
        <div className="video-card">
            <div className="instructions-dni">
                <span>📸</span> Tome una foto donde la persona sostenga su DNI. (Paso 2 de 3)
            </div>

            <div className="capture-area">
                {step === FLOW_STEPS.DNI_COMPLETE ? (
                    <>
                        <div className="capture-icon-container completed">✓</div>
                        <p className="capture-text">Foto de DNI capturada <br /> Rostro verificado</p>
                    </>
                ) : (
                    <video ref={videoRef} autoPlay muted className="video-preview" style={{ opacity: modelsLoaded ? 1 : 0 }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ width: '100%' }}>
                {step === FLOW_STEPS.DNI_COMPLETE ? (
                    <>
                        <button className="btn-recapture" onClick={handleRecaptureDni}>
                            <span style={{ marginRight: '8px', fontSize: '1.2em' }}>↻</span> TOMAR OTRA FOTO
                        </button>
                        <button className="btn-primary" onClick={handleContinueToFingerprint} disabled={!dniImageKey}>
                            CONTINUAR A HUELLA
                        </button>
                    </>
                ) : (
                    <button className="btn-capture" onClick={handleDniCapture} disabled={!modelsLoaded}>
                        <span style={{ marginRight: '8px', fontSize: '1.2em' }}>📸</span> CAPTURAR FOTO
                    </button>
                )}
                <button className="btn-secondary" onClick={() => setStep(FLOW_STEPS.SELFIE_COMPLETE)}>
                    ATRÁS (a la Selfie)
                </button>
            </div>
        </div>
    );

    const renderFingerprint = () => (
        <div className="video-card">
            <div className="fingerprint-area">
                <div className="fingerprint-icon">
                    {step === FLOW_STEPS.FINGERPRINT_COMPLETE ? "✓" :

                        <div style={{ background: '#4A9B7F', borderRadius: 9999, border: '4px #F5F9F7 solid' }} >
                            <img style={{ width: '100%', height: '100%' }} src="./huella.png" />
                        </div>
                    }
                </div>
                <p className="fingerprint-message">
                    {step === FLOW_STEPS.FINGERPRINT_COMPLETE
                        ? "¡Huella aceptada!"
                        : `Registre la huella. (Paso 3 de 3)`}
                </p>
            </div>

            <div style={{ width: '100%' }}>
                {step !== FLOW_STEPS.FINGERPRINT_COMPLETE ? (
                    <button
                        className="btn-capture"
                        onClick={handleFingerprintCapture}
                    >
                        {`REGISTRAR HUELLA `}
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleContinueToForm}
                    >
                        CONTINUAR AL FORMULARIO
                    </button>
                )}
                <button
                    className="btn-secondary"
                    onClick={() => setStep(FLOW_STEPS.DNI_COMPLETE)}
                >
                    ATRÁS (al DNI)
                </button>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="video-card">
            <Forms
                cerrarForm={cerrarForm}
                data={data}
                onFormCompleted={handleFormCompleted}
            />
        </div>
    );

    // --- RENDER FINAL ---
    const renderFinalSaved = () => (
        <div className="final-screen-card">
            <div className="final-icon-container">
                <div className="final-icon">✓</div>
            </div>
            <h2>¡Registro Completo!</h2>
            <p className="final-subtitle">
                La identidad ha sido registrada de forma segura en el dispositivo
            </p>
            <div className="data-protected-box">
                <div className="data-shield">🛡️ Datos Protegidos</div>
                <p>Toda tu información está cifrada y almacenada localmente</p>

                <h4 style={{ marginTop: '15px' }}>Resumen del registro:</h4>
                <ul className="checklist">
                    <li> {data.formData?.hashIdentidad.slice(0, 12) + "..."}</li>
                    <li>✓ Datos personales verificados ({Object.keys(data.formData).length > 0 ? 'Completado' : 'Pendiente'})</li>
                    <li>✓ Captura biométrica facial ({data.imagenSelfie ? 'Registrada' : 'Faltante'})</li>
                    <li>✓ huella digitales registradas</li>
                    <li>✓ Documento de identidad escaneado ({data.imagenDNI ? 'Registrado' : 'Faltante'})</li>
                </ul>
            </div>

            <button className="btn-export" onClick={empaquetar}>
                <span style={{ marginRight: '8px', fontSize: '1.2em' }}>⬇️</span> Publicar Datos <br /> {data.formData?.hashIdentidad.slice(0, 12) + "..."}
            </button>
            <p className="final-small-text">Compatible con estándares Web3 y DLT</p>

            <button
                className="btn-secondary"
                onClick={() => handleClearEnrollment(true)}
                style={{ marginTop: '20px', fontWeight: 'bold' }}
            >
                CARGAR A OTRA PERSONA (Reiniciar)
            </button>
        </div>
    );


    const renderFinal = () => (
        <div className="final-screen-card">
            <TransactionLogs transactionData={transactionData} />

            <button
                className="btn-secondary"
                onClick={() => handleClearEnrollment(true)}
                style={{ marginTop: '20px', fontWeight: 'bold' }}
            >
                CARGAR A OTRA PERSONA
            </button>
        </div>
    );


    // --- RENDER PRINCIPAL ---
    return (
        <div className="enrol-root">
            {isLoading ? (
                <LoadingSpinner message="Subiendo..." />
            ) : (
                <>
                    <p className="note">{message}</p>

                    {/* --- Flujo Biométrico --- */}
                    {(step === FLOW_STEPS.BIOMETRIC_SELFIE || step === FLOW_STEPS.SELFIE_COMPLETE) && renderSelfieCapture()}
                    {(step === FLOW_STEPS.DNI_CAPTURE || step === FLOW_STEPS.DNI_COMPLETE) && renderDniCapture()}
                    {(step === FLOW_STEPS.FINGERPRINT || step === FLOW_STEPS.FINGERPRINT_COMPLETE) && renderFingerprint()}

                    {/* --- Formulario --- */}
                    {step === FLOW_STEPS.FORM && renderForm()}

                    {/* --- Finalizado --- */}
                    {step === FLOW_STEPS.FINAL_SAVED && renderFinalSaved()}

                    {/* --- Finalizado --- */}
                    {step === FLOW_STEPS.RESULTADO_FINAL && renderFinal()}
                </>
            )}
        </div>
    );
}
