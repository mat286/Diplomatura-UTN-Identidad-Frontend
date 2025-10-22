import { ethers } from "ethers";

/**
 * Firma y envía una transacción para llamar a una función de un contrato inteligente.
 *
 * @param {string} contractAddress - La dirección del contrato.
 * @param {Array<object>} contractABI - La ABI del contrato.
 * @param {string} functionName - El nombre de la función del contrato a llamar.
 * @param {Array<any>} params - Los parámetros que toma la función del contrato.
 * @param {string} privateKey - La clave privada de la cuenta firmante.
 * @param {string} rpcUrl - La URL del nodo RPC (por ejemplo, Infura).
 * @returns {Promise<string>} El hash de la transacción.
 */
async function sendContractTransaction(
    contractAddress,
    contractABI,
    functionName,
    params,
    privateKey,
    rpcUrl
) {
    try {
        // 1. Conexión al nodo y creación del Wallet (firmante)
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);

        // 2. Creación de la instancia del Contrato
        // Esto permite interactuar con las funciones del contrato.
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);

        // 3. Preparación y Envío de la Transacción
        console.log(`Llamando a la función '${functionName}' con los parámetros:`, params);

        // Llamar a la función del contrato, 'wallet' firma la transacción automáticamente.
        // Se usa el operador spread '...' para pasar los argumentos.
        const tx = await contract[functionName](...params);

        console.log("Transacción enviada. Hash:", tx.hash);

        // 4. Esperar a que la transacción se confirme
        const receipt = await tx.wait(); // Espera 1 confirmación por defecto

        console.log("Transacción confirmada en el bloque:", receipt.blockNumber);
        return tx.hash;

    } catch (error) {
        console.error("Error al enviar la transacción:", error);
        throw error;
    }
}

// --- Ejemplo de Uso ---

// **IMPORTANTE**: Reemplaza estos valores con tus datos reales y sensibles
const PRIVATE_KEY = "0x..."; // ⚠️ ¡NUNCA expongas esto!
const RPC_URL = "https://mainnet.infura.io/v3/TU_API_KEY";
const CONTRACT_ADDRESS = "0x..."; // Dirección del contrato
const FUNCTION_NAME = "transfer"; // Nombre de la función, ej: "transfer", "setData", etc.
const CONTRACT_ABI = [
    // Solo se necesita la definición de la función que vas a llamar
    "function transfer(address recipient, uint256 amount) returns (bool)"
    // ... más ABI si es necesario
];
const FUNCTION_PARAMS = [
    "0x...", // recipient address (ej. 1er parámetro)
    ethers.parseUnits("100", "wei") // amount (ej. 2do parámetro) - 100 WEI
];

// Para una función que envía Ether junto con la llamada (value)
/*
const valueInEther = '0.01'; // 0.01 ETH
const overrides = {
    value: ethers.parseEther(valueInEther)
};
const tx = await contract[functionName](...params, overrides);
*/


// 5. Ejecutar el ejemplo
(async () => {
    try {
        const transactionHash = await sendContractTransaction(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            FUNCTION_NAME,
            FUNCTION_PARAMS,
            PRIVATE_KEY,
            RPC_URL
        );
        console.log("\nÉxito. Hash final:", transactionHash);
    } catch (e) {
        console.log("\nFallo en la ejecución principal.");
    }
})();