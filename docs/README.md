# 📚 Documentación del Proyecto

Bienvenido a la documentación completa del sistema de identidad biométrica. Esta carpeta contiene toda la información necesaria para entender, instalar, usar y desarrollar el sistema.

## 📖 Índice de Documentación

### [DOCUMENTACION.md](../DOCUMENTACION.md)
**Documentación principal del sistema**
- Introducción y características
- Arquitectura del sistema
- Tecnologías utilizadas
- Flujo de trabajo
- Configuración e instalación
- Guía de uso
- Seguridad y privacidad
- API y contratos

### [COMPONENTES.md](./COMPONENTES.md)
**Documentación detallada de componentes React**
- AppRouter
- Enrolamiento
- KeyProtocolScreen
- MenuScreen
- Forms
- PeopleList
- ImageDisplay
- LoadingSpinner
- TransactionLogs

### [FUNCIONES.md](./FUNCIONES.md)
**Documentación de funciones utilitarias**
- identityHash.js - Reconocimiento facial
- offlineStore.js - Almacenamiento offline
- encryptAndPackage.js - Cifrado y IPFS
- sendContractTransaction.js - Blockchain

---

## 🚀 Inicio Rápido

### 1. Leer Primero
Comienza leyendo [DOCUMENTACION.md](../DOCUMENTACION.md) para obtener una visión general del sistema.

### 2. Configuración
Sigue la sección "Configuración e Instalación" en la documentación principal para:
- Instalar dependencias
- Configurar variables de entorno
- Descargar modelos de face-api.js
- Iniciar la aplicación

### 3. Desarrollo
Si vas a desarrollar o modificar código:
- Lee [COMPONENTES.md](./COMPONENTES.md) para entender los componentes React
- Consulta [FUNCIONES.md](./FUNCIONES.md) para las funciones utilitarias

---

## 📋 Guías Específicas

### Para Usuarios Finales
- Lee la sección "Uso del Sistema" en [DOCUMENTACION.md](../DOCUMENTACION.md)

### Para Desarrolladores
1. Revisa la "Arquitectura del Sistema" en [DOCUMENTACION.md](../DOCUMENTACION.md)
2. Estudia los componentes en [COMPONENTES.md](./COMPONENTES.md)
3. Consulta las funciones en [FUNCIONES.md](./FUNCIONES.md)

### Para DevOps
- Variables de entorno: Ver sección en [DOCUMENTACION.md](../DOCUMENTACION.md)
- Requisitos de infraestructura: Ver "Requisitos Previos"

---

## 🔍 Búsqueda Rápida

### ¿Cómo funciona el reconocimiento facial?
Ver: [DOCUMENTACION.md](../DOCUMENTACION.md#flujo-de-trabajo) y [FUNCIONES.md](./FUNCIONES.md#identityhashjs)

### ¿Cómo se cifran los datos?
Ver: [FUNCIONES.md](./FUNCIONES.md#encryptandpackagejs)

### ¿Cómo interactúa con blockchain?
Ver: [FUNCIONES.md](./FUNCIONES.md#sendcontracttransactionjs)

### ¿Cómo funciona el almacenamiento offline?
Ver: [FUNCIONES.md](./FUNCIONES.md#offlinestorejs)

### ¿Cómo agregar un nuevo componente?
Ver: [COMPONENTES.md](./COMPONENTES.md)

---

## 📝 Convenciones

### Código
- Archivos de funciones: CamelCase (ej: `identityHash.js`)
- Componentes React: PascalCase (ej: `Enrolamiento.jsx`)
- Funciones: camelCase (ej: `handleCapturePhoto()`)

### Documentación
- Archivos MD: UPPERCASE (ej: `DOCUMENTACION.md`)
- Headers: Usar # para niveles

---

## ❓ Preguntas Frecuentes

### ¿Dónde está la configuración?
Ver sección "Variables de Entorno" en [DOCUMENTACION.md](../DOCUMENTACION.md)

### ¿Cómo subir datos a IPFS?
Ver función `uploadToPinata()` en [FUNCIONES.md](./FUNCIONES.md#uploadtopinata)

### ¿Cómo registrar en blockchain?
Ver función `crearIdentidad()` en [FUNCIONES.md](./FUNCIONES.md#crearidentidad)

---

## 🔗 Enlaces Útiles

- [face-api.js](https://github.com/justadudewhohacks/face-api.js)
- [IPFS Pinata](https://www.pinata.cloud/)
- [Ethers.js](https://docs.ethers.io/)
- [React Router](https://reactrouter.com/)
- [localforage](https://localforage.github.io/localForage/)

---

## 📞 Soporte

Para preguntas o problemas:
1. Revisa la documentación relevante
2. Consulta la sección "Troubleshooting" en [DOCUMENTACION.md](../DOCUMENTACION.md)
3. Abre un issue en el repositorio

---

**Última actualización:** Diciembre 2024
