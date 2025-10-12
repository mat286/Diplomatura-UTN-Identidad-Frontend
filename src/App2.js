import React, { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import { create as createIpfsClient } from "ipfs-http-client";

/*
App.jsx — PoC face-api.js con enrolamiento y verificación (matching + crypto-demo)

Resumen:
- Carga modelos face-api desde /models
- Captura imagen (camera o upload), extrae descriptor (Float32Array)
- Crea helperData simulado (HKDF + random), cifra y guarda en IndexedDB
- Provee dos métodos de verificación:
  1) verifyWithStoredRecord: demo criptográfico (descifra helper y compara H(K))
  2) verifyByMatching: compara descriptors (distancia Euclidiana) con un umbral

IMPORTANTE:
- En producción NO guardes la clave K en claro dentro del helperData.
- Este PoC guarda K en el helper (solo para demostrar el flujo).  
*/

//
// ---------- IndexedDB helpers ----------
//
function openDB(dbName = "offline-sync-db", storeName = "records") {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}
async function idbPut(record, dbName = "offline-sync-db", storeName = "records") {
    const db = await openDB(dbName, storeName);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const st = tx.objectStore(storeName);
        const req = st.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
    });
}
async function idbGetAll(dbName = "offline-sync-db", storeName = "records") {
    const db = await openDB(dbName, storeName);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const st = tx.objectStore(storeName);
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}
async function idbDelete(id, dbName = "offline-sync-db", storeName = "records") {
    const db = await openDB(dbName, storeName);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const st = tx.objectStore(storeName);
        const req = st.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
    });
}

//
// ---------- Web Crypto helpers (AES-GCM, PBKDF2, HKDF) ----------
//
async function deriveMasterKeyFromPassword(password, salt) {
    const enc = new TextEncoder();
    const pwKey = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    const masterKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
        pwKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    return masterKey;
}
async function generateSymKey() {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
async function exportRaw(key) {
    const raw = await crypto.subtle.exportKey("raw", key);
    return new Uint8Array(raw);
}
async function importRaw(raw) {
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}
async function encryptAesGcm(key, plainBuffer) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBuffer);
    return { ct: new Uint8Array(ct), iv };
}
async function decryptAesGcm(key, ctBuffer, iv) {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ctBuffer);
    return new Uint8Array(plain);
}
async function wrapSymKey(masterKey, symKey) {
    const raw = await exportRaw(symKey);
    const { ct, iv } = await encryptAesGcm(masterKey, raw.buffer);
    return { ct, iv };
}
async function unwrapSymKey(masterKey, wrapped) {
    const raw = await decryptAesGcm(masterKey, base64ToUint8Array(wrapped.ct).buffer, base64ToUint8Array(wrapped.iv));
    return importRaw(raw.buffer);
}

// HKDF deriveBits helper (deriva K desde template si querés)
async function hkdfDerive(keyingMaterialUint8, saltUint8, lengthBits = 256) {
    const master = await crypto.subtle.importKey("raw", keyingMaterialUint8, "HKDF", false, ["deriveBits"]);
    const derived = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: saltUint8, info: new Uint8Array([]) }, master, lengthBits);
    return new Uint8Array(derived);
}

//
// ---------- util base64 / hex ----------
//
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
function arrayBufferToHex(buffer) {
    const u8 = new Uint8Array(buffer);
    return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256HexFromUint8(u8) {
    const buf = u8 instanceof Uint8Array ? u8.buffer : u8;
    const h = await crypto.subtle.digest("SHA-256", buf);
    return "0x" + arrayBufferToHex(h);
}

//
// ---------- IPFS helper ----------
//
function createIpfs(infuraProjectId, infuraProjectSecret) {
    if (infuraProjectId && infuraProjectSecret) {
        const auth = "Basic " + btoa(infuraProjectId + ":" + infuraProjectSecret);
        return createIpfsClient({
            host: "ipfs.infura.io",
            port: 5001,
            protocol: "https",
            headers: { authorization: auth },
        });
    }
    return createIpfsClient({ url: "https://ipfs.infura.io:5001/api/v0" });
}

//
// ---------- face-api helper: crear helperData desde descriptor ----------
//
async function createHelperFromDescriptor(descriptorFloat32) {
    const buf = new Uint8Array(descriptorFloat32.buffer);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const K = await hkdfDerive(buf, salt, 256); // 256 bits
    const helperRandom = crypto.getRandomValues(new Uint8Array(32));
    return {
        template: uint8ArrayToBase64(buf),
        salt: uint8ArrayToBase64(salt),
        helperRandom: uint8ArrayToBase64(helperRandom),
        K: uint8ArrayToBase64(K), // en demo solo; no guardar K en claro en producción
    };
}

async function loadFaceApiModels(modelsUrl = "/models") {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelsUrl);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl);
}

//
// ---------- Verificación helpers que pediste ----------
//

/**
 * verifyWithStoredRecord:
 * - unwraps the symmetric key with masterKey
 * - decrypts helperData
 * - reads helper.K (demo) and compares sha256(K) === record.identityHash
 */
async function verifyWithStoredRecord(record, masterKeyRefLocal) {
    if (!masterKeyRefLocal || !masterKeyRefLocal.mk) throw new Error("Master key no inicializada");
    // unwrap symmetric key
    const wrapped = record.wrappedKey; // { ct: base64, iv: base64 }
    const symKey = await unwrapSymKey(masterKeyRefLocal.mk, wrapped);
    // decrypt helperData
    const ctU8 = base64ToUint8Array(record.ciphertext);
    const ivU8 = base64ToUint8Array(record.iv);
    const plainU8 = await decryptAesGcm(symKey, ctU8.buffer, ivU8);
    const plainJson = new TextDecoder().decode(plainU8);
    const payload = JSON.parse(plainJson); // payload.helper.{template,salt,helperRandom,K}
    if (!payload.helper || !payload.helper.K) throw new Error("helperData inválido o no contiene K (modo demo)");
    const K_u8 = base64ToUint8Array(payload.helper.K);
    const computedHash = await sha256HexFromUint8(K_u8);
    const storedHash = record.identityHash;
    const ok = computedHash.toLowerCase() === storedHash.toLowerCase();
    return { ok, computedHash, storedHash, payload }; // payload for debug
}

/**
 * verifyByMatching:
 * - obtains template descriptor (decrypt if necessary)
 * - compares newDescriptor (Float32Array) vs template (Float32Array)
 * - returns distance and boolean (distance <= tolerance)
 */
function euclideanDistance(a, b) {
    if (a.length !== b.length) throw new Error("length mismatch");
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}
async function verifyByMatching(record, newDescriptor, masterKeyRefLocal, tolerance = 0.6) {
    let templateFloat32;
    if (record.helperPreview && record.helperPreview.template) {
        const tplU8 = base64ToUint8Array(record.helperPreview.template);
        templateFloat32 = new Float32Array(tplU8.buffer);
    } else {
        // decrypt to get template
        if (!masterKeyRefLocal || !masterKeyRefLocal.mk) throw new Error("Master key no inicializada");
        const wrapped = record.wrappedKey;
        const symKey = await unwrapSymKey(masterKeyRefLocal.mk, wrapped);
        const ctU8 = base64ToUint8Array(record.ciphertext);
        const ivU8 = base64ToUint8Array(record.iv);
        const plainU8 = await decryptAesGcm(symKey, ctU8.buffer, ivU8);
        const payload = JSON.parse(new TextDecoder().decode(plainU8));
        const tplU8 = base64ToUint8Array(payload.helper.template);
        templateFloat32 = new Float32Array(tplU8.buffer);
    }
    const dist = euclideanDistance(templateFloat32, newDescriptor);
    const ok = dist <= tolerance;
    return { ok, distance: dist, tolerance };
}

//
// ---------- React component ----------
//
export default function App() {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [password, setPassword] = useState("");
    const [masterKeyReady, setMasterKeyReady] = useState(false);
    const masterKeyRef = useRef(null);

    const [records, setRecords] = useState([]);
    const [infuraId, setInfuraId] = useState("");
    const [infuraSecret, setInfuraSecret] = useState("");
    const [ipfsClient, setIpfsClient] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        (async () => {
            await loadFaceApiModels("/models");
            setModelsLoaded(true);
            setRecords(await idbGetAll());
        })();
    }, []);

    useEffect(() => {
        if (infuraId) setIpfsClient(createIpfs(infuraId, infuraSecret));
        else setIpfsClient(null);
    }, [infuraId, infuraSecret]);

    async function initMasterKey() {
        if (!password) return alert("Ingresa contraseña");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const mk = await deriveMasterKeyFromPassword(password, salt);
        masterKeyRef.current = { mk, salt };
        setMasterKeyReady(true);
        alert("Clave maestra derivada (ephemeral)");
    }

    // camera helpers
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return alert("Tu navegador no soporta cámara");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
    }
    function stopCamera() {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
    }

    // capture + process
    async function captureFromCamera() {
        if (!modelsLoaded) return alert("Modelos no cargados aún");
        if (!masterKeyReady) return alert("Deriva la clave maestra primero");
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const detections = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
        if (!detections) return alert("No se detectó una cara clara. Intenta otra toma.");
        const descriptor = detections.descriptor; // Float32Array(128)
        await processDescriptorAndStore(descriptor, "camera_capture.jpg");
    }

    async function handleFileUpload(file) {
        if (!modelsLoaded) return alert("Modelos no cargados aún");
        if (!masterKeyReady) return alert("Deriva la clave maestra primero");
        if (!file) return;
        const img = await faceapi.bufferToImage(file);
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const detections = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
        if (!detections) return alert("No se detectó una cara en la imagen.");
        const descriptor = detections.descriptor;
        await processDescriptorAndStore(descriptor, file.name);
    }

    async function processDescriptorAndStore(descriptorFloat32, filename) {
        // 1) crear helperData (simulada)
        const helper = await createHelperFromDescriptor(descriptorFloat32);

        // 2) cifrar helper JSON con key simétrica por registro
        const sym = await generateSymKey();
        const helperJson = JSON.stringify({ helper });
        const { ct, iv } = await encryptAesGcm(sym, new TextEncoder().encode(helperJson));

        // 3) wrap la key simétrica con masterKey
        const wrapped = await wrapSymKey(masterKeyRef.current.mk, sym);

        // 4) identityHash: hash de rawSym (demo)
        const rawSym = await exportRaw(sym);
        const idHashBuf = await crypto.subtle.digest("SHA-256", rawSym);
        const identityHashHex = "0x" + arrayBufferToHex(idHashBuf);

        // 5) guardar registro en IndexedDB
        const id = crypto.randomUUID();
        const rec = {
            id,
            filename,
            createdAt: Date.now(),
            ciphertext: uint8ArrayToBase64(ct),
            iv: uint8ArrayToBase64(iv),
            wrappedKey: { ct: uint8ArrayToBase64(wrapped.ct), iv: uint8ArrayToBase64(wrapped.iv) },
            helperPreview: helper, // sólo debug en PoC (contiene K), no mostrar en producción
            identityHash: identityHashHex,
            state: "pending",
        };
        await idbPut(rec);
        setRecords(await idbGetAll());
        alert("HelperData creado y guardado localmente (cifrado).");
    }

    // sync to IPFS (optional)
    async function handleSyncOne(record) {
        if (!ipfsClient) return alert("Configura credenciales IPFS");
        try {
            const payload = { ct: record.ciphertext, iv: record.iv, meta: { filename: record.filename, createdAt: record.createdAt } };
            const json = JSON.stringify(payload);
            const added = await ipfsClient.add(json);
            const cid = added.cid.toString();
            const updated = { ...record, ipfsCid: cid, state: "uploaded", uploadedAt: Date.now() };
            await idbPut(updated);
            setRecords(await idbGetAll());
            alert("Subido a IPFS: " + cid + "\nAhora podés registrar el CID en tu contrato.");
        } catch (e) {
            console.error(e);
            alert("Fallo al sincronizar: " + e.message);
        }
    }

    async function handleSyncAll() {
        const all = await idbGetAll();
        for (const r of all) if (r.state === "pending") await handleSyncOne(r);
    }

    async function handleDelete(id) {
        await idbDelete(id);
        setRecords(await idbGetAll());
    }

    // -------------- UI-driven verification: selecciona registro y verifica --------------
    async function handleVerifyAgainstRecord(record) {
        // tomar descriptor actual desde canvas (necesitas tener una imagen en canvas o cámara)
        const detections = await faceapi.detectSingleFace(canvasRef.current).withFaceLandmarks().withFaceDescriptor();
        if (!detections) return alert("No se detectó una cara para verificación. Asegurate de capturar o subir una imagen primero.");
        const newDesc = detections.descriptor;
        // crypto demo
        let cryptoRes = { ok: false, err: null };
        try {
            cryptoRes = await verifyWithStoredRecord(record, masterKeyRef.current);
        } catch (e) {
            cryptoRes = { ok: false, err: e.message };
        }
        // matching
        let matchRes = { ok: false, distance: null };
        try {
            matchRes = await verifyByMatching(record, newDesc, masterKeyRef.current, 0.6);
        } catch (e) {
            matchRes = { ok: false, err: e.message };
        }

        alert(
            `Resultado verificación:\n- Crypto demo: ${cryptoRes.ok}${cryptoRes.err ? " (err: " + cryptoRes.err + ")" : ""}\n- Matching: ${matchRes.ok} (dist=${matchRes.distance ? matchRes.distance.toFixed(4) : "n/a"})`
        );
    }

    return (
        <div style={{ padding: 18, fontFamily: "Arial, sans-serif" }}>
            <h1>PoC face-api.js — Enrolamiento y Verificación</h1>

            <section style={{ marginBottom: 12 }}>
                <h3>1) Modelos & Clave maestra</h3>
                <div>Modelos cargados: {modelsLoaded ? "Sí" : "No"}</div>
                <input type="password" placeholder="contraseña local" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button onClick={initMasterKey}>Derivar clave maestra</button>
                <div>Clave lista: {masterKeyReady ? "Sí" : "No"}</div>
            </section>

            <section style={{ marginBottom: 12 }}>
                <h3>2) IPFS (opcional)</h3>
                <input placeholder="INFURA_PROJECT_ID" value={infuraId} onChange={(e) => setInfuraId(e.target.value)} />
                <input placeholder="INFURA_PROJECT_SECRET" value={infuraSecret} onChange={(e) => setInfuraSecret(e.target.value)} />
                <div>IPFS listo: {ipfsClient ? "Sí" : "No"}</div>
            </section>

            <section style={{ marginBottom: 12 }}>
                <h3>3) Captura / Enrolar</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div>
                        <video ref={videoRef} autoPlay muted style={{ width: 320, height: 240, background: "#000" }} />
                        <div style={{ marginTop: 8 }}>
                            <button onClick={startCamera}>Iniciar cámara</button>
                            <button onClick={captureFromCamera}>Capturar y enrolar</button>
                            <button onClick={stopCamera}>Detener</button>
                        </div>
                    </div>
                    <div>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
                        <p>O sube una imagen con la cara.</p>
                    </div>
                </div>
                <canvas ref={canvasRef} style={{ display: "block", marginTop: 8, maxWidth: "100%" }} />
            </section>

            <section style={{ marginBottom: 12 }}>
                <h3>4) Cola local y verificación</h3>
                <button onClick={async () => setRecords(await idbGetAll())}>Actualizar lista</button>
                <button onClick={handleSyncAll} disabled={!ipfsClient}>Sincronizar todo</button>
                <div style={{ marginTop: 8 }}>
                    {records.length === 0 ? (
                        <div>No hay registros</div>
                    ) : (
                        records.map((r) => (
                            <div key={r.id} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                                <div>
                                    <div><strong>{r.filename}</strong></div>
                                    <div style={{ fontSize: 12, color: "#666" }}>estado: {r.state} {r.ipfsCid ? "| cid: " + r.ipfsCid : ""}</div>
                                    <div style={{ fontSize: 11, color: "#999" }}>{r.identityHash}</div>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {r.state === "pending" && <button onClick={() => handleSyncOne(r)}>Sync</button>}
                                    {r.ipfsCid && <a target="_blank" rel="noreferrer" href={`https://ipfs.io/ipfs/${r.ipfsCid}`}>ver</a>}
                                    <button onClick={() => handleDelete(r.id)}>Eliminar</button>
                                    <button onClick={() => handleVerifyAgainstRecord(r)}>Verificar contra este registro</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section>
                <h3>Explicación rápida</h3>
                <ol>
                    <li>Cargar modelos: face-api.js (servir en /models).</li>
                    <li>Captura: cámara o upload → descriptor (Float32Array).</li>
                    <li>Enrolamiento: creamos helperData (demo), ciframos y guardamos localmente; identityHash se calcula y se guarda también.</li>
                    <li>Verificación: seleccioná registro, asegurate de tener la imagen actual en canvas y pulsa <em>Verificar</em>. Se ejecutan dos métodos y se muestra el resultado.</li>
                </ol>
            </section>
        </div>
    );
}
