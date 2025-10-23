import { ethers } from "ethers";

// ⚠️ REEMPLAZA ESTOS VALORES
const CONTRACT_ADDRESS = "0xb86bdcf91acba3ab2fccacbaf50a3ce6c1c56d5c"; // La dirección de tu contrato desplegado
// Usa la ABI definida arriba o la completa de Remix
/* const CONTRACT_ABI = [
    "function createId(bytes32 _hashIdentidad, string memory _ipfsCID) public"
]; */
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_addrCurso",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_numeroClase",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_claseCID",
                "type": "string"
            }
        ],
        "name": "addClaseCID",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_nombre",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "_docente",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_ipfsCID",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_cantidadCursos",
                "type": "uint256"
            }
        ],
        "name": "createEvent",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_hashIdentidad",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "_ipfsCID",
                "type": "string"
            }
        ],
        "name": "createId",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "_direccion",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_timestamp",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "_mensaje",
                "type": "string"
            }
        ],
        "name": "NewEvent",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "_hashIdentidad",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "_direccion",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_timestamp",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "_mensaje",
                "type": "string"
            }
        ],
        "name": "NuevaId",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_addr",
                "type": "address"
            }
        ],
        "name": "auditoria",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_hashIdentidad",
                "type": "bytes32"
            }
        ],
        "name": "consultarHelpData",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "personas",
        "outputs": [
            {
                "internalType": "bytes32",
                "name": "hashIdentidad",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "ipfsCID",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const SEPOLIA_CHAIN_ID = 11155111n; // Chain ID de Sepolia como BigInt
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

/**
 * Función central para conectar a MetaMask, verificar y, si es necesario, cambiar a Sepolia.
 * @returns {Promise<ethers.Signer>} El firmante conectado a Sepolia.
 */
async function getSepoliaSigner() {
    if (!window.ethereum) {
        throw new Error("MetaMask no está instalado.");
    }

    // 1. Solicitar conexión de cuentas
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // 2. Crear el proveedor y obtener la red
    let provider = new ethers.BrowserProvider(window.ethereum);
    let network = await provider.getNetwork();

    // 3. Verificar si estamos en Sepolia
    if (network.chainId !== SEPOLIA_CHAIN_ID) {
        try {
            console.log(`Cambiando de red (ID: ${network.chainId}) a Sepolia...`);

            // Intentar solicitar el cambio de red
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
            });

            // ⚠️ CLAVE: Después de un cambio exitoso, re-inicializamos el provider
            // y obtenemos la nueva red y el signer.
            provider = new ethers.BrowserProvider(window.ethereum);
            network = await provider.getNetwork();

            if (network.chainId !== SEPOLIA_CHAIN_ID) {
                // Esto solo debería ocurrir si el usuario cancela la solicitud de cambio
                throw new Error("Por favor, cambia manualmente tu wallet a la red Sepolia y vuelve a intentar.");
            }
            console.log("Cambio de red completado con éxito a Sepolia.");

        } catch (switchError) {
            // 4001 es el código de error si el usuario rechaza la petición en MetaMask.
            if (switchError.code === 4001) {
                throw new Error("Solicitud de cambio de red rechazada por el usuario.");
            }
            throw new Error(`Error al intentar cambiar de red: ${switchError.message}`);
        }
    }

    // 4. Obtener el Signer (Firmante) de la red correcta
    return provider.getSigner();
}

// -------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE INTERACCIÓN
// -------------------------------------------------------------

export async function crearIdentidad(hashIdentidad, ipfsCID) {
    try {
        // ... (Tu validación de hashIdentidad) ...
        if (!hashIdentidad.startsWith("0x") || hashIdentidad.length !== 66) {
            throw new Error("El hash de identidad debe ser un string hexadecimal de 66 caracteres (incluyendo '0x').");
        }

        // Obtener el signer verificado en Sepolia
        const signer = await getSepoliaSigner();

        console.log("Cuenta conectada y en Sepolia:", await signer.getAddress());

        // 2. Crear la instancia del Contrato
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // 3. Llamar a la función 'createId'
        console.log(`Enviando transacción para crear ID...`);

        const tx = await contract.createId(hashIdentidad, ipfsCID);

        console.log("Transacción enviada. Hash:", tx.hash);

        // 4. Esperar la confirmación
        const receipt = await tx.wait();
        console.log("✅ Identidad creada y transacción confirmada en el bloque:", receipt.blockNumber);

        return receipt;

    } catch (error) {
        console.error("❌ Error al crear la identidad:", error.message || error);
        alert(`Fallo en la transacción: ${error.message || "Verifica la consola para más detalles."}`);
    }
}