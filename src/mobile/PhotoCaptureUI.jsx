import React from 'react';

const PhotoCaptureUI = ({
    videoRef,
    canvasRef,
    onCapture,
    onContinue,
    onBack,
    message,
    captureDisabled,
    isCaptured,
    onRecapture 
}) => {

    // Contenido del área central que cambia
    const centralContent = isCaptured ? (
        <div className="confirmation-content">
            <div className="check-circle">
                <span className="check-icon" role="img" aria-label="visto bueno">✓</span>
            </div>
            <p className="status-title">Foto capturada</p>
            <p className="status-subtitle">Biometría registrada</p>
        </div>
    ) : (
        <div className="camera-placeholder">
            <video ref={videoRef} autoPlay muted className="camera-video" />
            {message && (
                <div className="status-overlay">
                    <p>{message}</p>
                </div>
            )}
        </div>
    );

    // Botón de acción principal (cambia si está capturada o no)
    const primaryActionButton = isCaptured ? (
        <button
            className="recapture-button"
            onClick={onRecapture}
        >
            <span className="recapture-icon" role="img" aria-label="volver a tomar">&#8635;</span>
            TOMAR OTRA FOTO
        </button>
    ) : (
        <button
            className="capture-button"
            onClick={onCapture}
            disabled={captureDisabled}
        >
            <span className="camera-icon-small" role="img" aria-label="cámara">📸</span>
            Capturar Foto
        </button>
    );

    return (
        <div className="photo-screen-container">
            {/* 1. Alerta de iluminación */}
            <div className="illumination-alert">
                <span className="camera-icon-small" role="img" aria-label="cámara">📸</span>
                <p className="alert-text">
                    Asegúrese de estar en un lugar bien iluminado y que su rostro sea completamente visible
                </p>
            </div>

            {/* 2. Área Central (Cámara o Confirmación) */}
            <div className="camera-preview-area">
                {centralContent}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* 3. Botón de Acción Principal (Capturar Foto / Tomar Otra Foto) */}
            {primaryActionButton}

            {/* 4. Botones de Navegación */}
            <div className="navigation-buttons-group">
                <button className="continue-button" onClick={onContinue} disabled={!isCaptured}>
                    CONTINUAR
                </button>
                <button className="back-button" onClick={onBack}>
                    ATRÁS
                </button>
            </div>
        </div>
    );
};

export default PhotoCaptureUI;