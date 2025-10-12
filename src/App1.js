import React, { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import { create as createIpfsClient } from "ipfs-http-client";

/*
PoC React (en Español) - integración con face-api.js

Qué hace este archivo:
- Carga modelos de face-api.js (TensorFlow.js) en el navegador.
- Permite capturar una foto desde la cámara o subir un archivo.
- Calcula el *descriptor* (embedding facial) usando face-api.js.
- Genera una helperData simulada a partir del descriptor (HKDF + random), cifra la helperData con AES-GCM,
  envuelve la clave simétrica con una clave maestra derivada de contraseña y guarda todo en IndexedDB.
- Permite sincronizar los blobs cifrados a IPFS (Infura) y marcar como subidos.

Requisitos:
- Instalar dependencias: `npm install face-api.js @tensorflow/tfjs ipfs-http-client ethers`
- Descargar los modelos de face-api y ponerlos en `public/models/` (o cambiar la ruta de carga).
  Modelos mínimos necesarios (puedes usar versiones ligeras):
    - face_landmark_68_model
    - face_recognition_model
    - ssd_mobilenetv1_model (o tiny_face_detector_model si prefieres)
  Puedes obtenerlos desde el repo de face-api o usar @vladmandic/face-api distribuciones.

Notas de seguridad:
- Esto es un PoC. No guardes K en claro en producción.
- Siempre cifrar helperData antes de subir a IPFS.
*/

// ---------- IndexedDB helpers (igual que antes) ----------
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

// ---------- Web Crypto helpers (AES-GCM, PBKDF2, HKDF helpers) ----------
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
async function decryptAesGcm(key, ct, iv) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
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

// ---------- util base64 / hex ----------
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

// ---------- IPFS helper (ipfs-http-client) ----------
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

// ---------- Crear helperData simulada a partir del descriptor facial ----------
// Explicación: usamos el descriptor (embedding Float32Array) como "template" y derivamos una K con HKDF.
// Generamos helperRandom (32 bytes) y devolvemos template (base64), salt y helperRandom y K (solo para demo).
async function createHelperFromDescriptor(descriptorFloat32) {
  // descriptorFloat32: Float32Array
  // convertimos a Uint8Array (raw bytes) para usar en HKDF
  const buf = new Uint8Array(descriptorFloat32.buffer);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const K = await hkdfDerive(buf, salt, 256); // 256 bits
  const helperRandom = crypto.getRandomValues(new Uint8Array(32));
  return {
    template: uint8ArrayToBase64(buf),
    salt: uint8ArrayToBase64(salt),
    helperRandom: uint8ArrayToBase64(helperRandom),
    K: uint8ArrayToBase64(K), // solo para demo. No guardar en claro en prod.
  };
}

// ---------- face-api.js model loader ----------
async function loadFaceApiModels(modelsUrl = "/models") {
  // Carga los modelos necesarios desde public/models
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelsUrl);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl);
}

// ---------- React component ----------
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

  // ---------- Camera helpers ----------
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

  // Captura frame de la cámara, calcula descriptor y procesa helperData
  async function captureFromCamera() {
    if (!modelsLoaded) return alert("Modelos no cargados aún");
    if (!masterKeyReady) return alert("Deriva la clave maestra primero");
    if (!videoRef.current) return;

    // dibujar frame en canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // detectar cara y obtener descriptor
    const detections = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
    if (!detections) return alert("No se detectó una cara clara. Intenta otra toma.");

    const descriptor = detections.descriptor; // Float32Array(128)
    await processDescriptorAndStore(descriptor, "camera_capture.jpg");
  }

  // Manejar archivo subido
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

  // Procesa el descriptor facial: crea helperData, cifra y guarda local
  async function processDescriptorAndStore(descriptorFloat32, filename) {
    // 1) crear helperData (simulada)
    const helper = await createHelperFromDescriptor(descriptorFloat32);

    // 2) cifrar helper JSON con key simétrica por registro
    const sym = await generateSymKey();
    const helperJson = JSON.stringify({ helper });
    const { ct, iv } = await encryptAesGcm(sym, new TextEncoder().encode(helperJson));

    // 3) wrap la key simétrica con masterKey
    const wrapped = await wrapSymKey(masterKeyRef.current.mk, sym);

    // 4) identityHash: hash de K + salt (demo). Usa bytes hex con 0x si lo vas a enviar on-chain.
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
      helperPreview: helper, // para debug; en producción no mostrar K
      identityHash: identityHashHex,
      state: "pending",
    };
    await idbPut(rec);
    setRecords(await idbGetAll());
    alert("HelperData creado y guardado localmente (cifrado).");
  }

  // Sincronizar a IPFS usando ipfs-http-client (si está configurado)
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
      alert("Subido a IPFS: " + cid + "Ahora podés registrar el CID en el contrato en la blockchain(si querés).");
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

  return (
    <div style={{ padding: 18, fontFamily: "Arial, sans-serif" }}>
      <h1>PoC face-api.js — Enrolamiento biométrico (offline → IPFS)</h1>

      <section style={{ marginBottom: 12 }}>
        <h3>1) Cargar modelos y clave maestra</h3>
        <div>Modelos cargados: {modelsLoaded ? "Sí" : "No"}</div>
        <input type="password" placeholder="contraseña local" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={initMasterKey}>Derivar clave maestra</button>
        <div>Clave lista: {masterKeyReady ? "Sí" : "No"}</div>
      </section>

      <section style={{ marginBottom: 12 }}>
        <h3>2) Configurar IPFS (Infura opcional)</h3>
        <input placeholder="INFURA_PROJECT_ID" value={infuraId} onChange={(e) => setInfuraId(e.target.value)} />
        <input placeholder="INFURA_PROJECT_SECRET" value={infuraSecret} onChange={(e) => setInfuraSecret(e.target.value)} />
        <div>IPFS listo: {ipfsClient ? "Sí" : "No"}</div>
      </section>

      <section style={{ marginBottom: 12 }}>
        <h3>3) Captura biométrica</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div>
            <video ref={videoRef} autoPlay muted style={{ width: 320, height: 240, background: "#000" }} />
            <div style={{ marginTop: 8 }}>
              <button onClick={startCamera}>Iniciar cámara</button>
              <button onClick={captureFromCamera}>Capturar</button>
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
        <h3>4) Cola local</h3>
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
                  <div style={{ fontSize: 12, color: "#666" }}>estado: {r.state} {r.ipfsCid ? '| cid: ' + r.ipfsCid : ''}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>{r.identityHash}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {r.state === "pending" && <button onClick={() => handleSyncOne(r)}>Sync</button>}
                  {r.ipfsCid && <a target="_blank" rel="noreferrer" href={`https://ipfs.io/ipfs/${r.ipfsCid}`}>ver</a>}
                  <button onClick={() => handleDelete(r.id)}>Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3>Qué hace cada parte (explicación)</h3>
        <ol>
          <li><strong>Carga de modelos</strong>: face-api.js usa modelos TF.js que debes servir desde <code>/models</code>. Esto permite calcular landmarks y el descriptor facial (embedding).</li>
          <li><strong>Captura</strong>: puedes usar cámara o subir imagen. El canvas sirve de buffer para hacer las detecciones con face-api.js.</li>
          <li><strong>Descriptor</strong>: face-api devuelve un <em>Float32Array</em> de 128 dimensiones que es la "plantilla" biométrica (embedding).</li>
          <li><strong>HelperData</strong>: a partir del descriptor creamos una helperData simulada (salt + helperRandom + K derivada por HKDF). En producción esto debe ser un extractor difuso real o un esquema de fuzzy-commitment/ECC.</li>
          <li><strong>Cifrado</strong>: helperData JSON se cifra con AES-GCM usando una clave simétrica por registro; esa clave se envuelve con la clave maestra derivada de la contraseña local.</li>
          <li><strong>Almacenamiento local</strong>: guardamos ciphertext, iv, wrappedKey y un identityHash (hash de la key simétrica) en IndexedDB para sincronizar luego.</li>
          <li><strong>Sincronización</strong>: cuando hay internet, subimos el blob cifrado a IPFS y guardamos el CID; la blockchain almacena solo el commit/hash público (si decides registrar).</li>
        </ol>
        <p>Si querés que integre la verificación (tomar una nueva foto en clase, descargar helperData y comprobar en cliente) también lo implemento.</p>
      </section>
    </div>
  );
}
