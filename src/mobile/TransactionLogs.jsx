import React from 'react';
import './TransactionLogs.css';

// --- Datos Fijos de Ejemplo (Tomados de tu imagen) ---
const transactionData = {
    account: "0xd855A114CBa38d41905861daFe1b5829aefa89CC",
    hash: "0xace117a9166d507371415edela4b80d6aa01a27657ceb1b44c854f0484524f26",
    block: "9482487",
    status: "success" // O 'pending', 'error'
};


const ETHERSCAN_URL = "https://sepolia.etherscan.io";

// --- Componente principal ---
const TransactionLogs = ({ transactionData }) => {

    const { account, hash, block, status } = transactionData;

    // Genera el enlace de la transacción para Etherscan
    const transactionLink = `${ETHERSCAN_URL}/tx/${hash}`;
    // Genera el enlace de la cuenta para Etherscan
    const accountLink = `${ETHERSCAN_URL}/address/${account}`;

    // Define los pasos del log
    const logs = [
        {
            id: 1,
            message: `Cuenta conectada y en Sepolia: ${account}`,
            link: accountLink,
            label: "Ver Cuenta (Etherscan)",
            status: 'info'
        },
        {
            id: 2,
            message: "Enviando transacción para crear ID...",
            status: 'info'
        },
        {
            id: 3,
            message: `Transacción enviada. Hash: ${hash}`,
            link: transactionLink,
            label: "Ver Transacción (Etherscan)",
            status: 'info'
        },
        {
            id: 4,
            message: `Identidad creada y transacción confirmada en el bloque: ${block}`,
            icon: '✅',
            status: 'success',
            highlight: true
        },
        {
            id: 5,
            message: "Identidad creada en blockchain con éxito.",
            status: 'final',
            highlight: true
        },
    ];

    return (
        <div className="log-container">
            <h2 className="log-header">📝 Registro de Transacción en Blockchain</h2>
            <div className="log-list">
                {logs.map((log) => (
                    <div key={log.id} className={`log-item ${log.status} ${log.highlight ? 'highlight' : ''}`}>
                        {/* Icono (si existe) */}
                        {log.icon && <span className="log-icon">{log.icon}</span>}

                        {/* Mensaje del Log */}
                        <span className="log-message">{log.message}</span>

                        {/* Enlace a Etherscan (si existe) */}
                        {log.link && (
                            <a
                                href={log.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="log-link"
                                title={log.label}
                            >
                                {log.label}
                            </a>
                        )}
                    </div>
                ))}
            </div>

            <div className="transaction-summary">
                <p>
                    **Hash de Transacción:** <a href={transactionLink} target="_blank" rel="noopener noreferrer">
                        {hash}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default TransactionLogs;