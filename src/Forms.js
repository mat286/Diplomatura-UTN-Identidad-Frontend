import React, { useState, useEffect } from 'react';
import ImageDisplay from './ImageDisplay';

/**
 * Forms - Formulario para añadir personas
 *
 * Props:
 *  - cerrarForm: function() -> se llama cuando querés cerrar el formulario
 *  - onAddPerson: optional function(newPerson) -> si está provista, Forms llamará a esta función
 *                 en lugar de gestionar su propio peopleList/localStorage.
 *
 * Behavior:
 *  - Si onAddPerson no se provee, Forms mantiene su propio peopleList en localStorage (comportamiento legacy).
 *  - Si onAddPerson existe, Forms delega la adición al padre y NO sobrescribe peopleList en localStorage.
 */

// Función auxiliar para obtener el array de personas desde Local Storage 
const getInitialPeople = () => {
    const savedPeople = localStorage.getItem('peopleList');
    try {
        return savedPeople ? JSON.parse(savedPeople) : [];
    } catch (error) {
        console.error("Error al parsear 'peopleList' del Local Storage:", error);
        return [];
    }
};

// Estado inicial para una persona nueva
const initialFormData = {
    nombre: '',
    apellido: '',
    sexo: '',
    genero: '',
    etnia: '',
    nfamilia: '',
    dni: '',
    nivelEscolar: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
    zona: '',
    provincia: '',
    productor: [],
    productorOtro: '',
    nivel: '',
    superficiePredio: '',
    superficieProductiva: '',
    interesCapacitacion: [],
    interesCapacitacionOtro: '',
};

// Estas constantes deben estar fuera del componente o dentro para Forms.js
const OPCIONES_PRODUCCION = [
    "apicultura", "bovino", "avícola", "caprino", "porcino",
    "ovino", "agrofloresta", "leña", "carbonero", "algarroba", "otros"
];

const OPCIONES_NIVEL = [
    { value: 'inicial', label: 'Inicial (recién comienza)' },
    { value: 'intermedio', label: 'Intermedio (produce y vende localmente)' },
    { value: 'experto', label: 'Experto (comercializa con intermediarios)' }
];



const Forms = ({ cerrarForm, onAddPerson, data, onFormCompleted } = {}) => {
    // Estado para la nueva persona
    const [formData, setFormData] = useState(initialFormData);

    // Si onAddPerson no existe, mantenemos peopleList localmente
    const [peopleList, setPeopleList] = useState(getInitialPeople);

    // Estado para controlar el mensaje de éxito
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Guardar en localStorage sólo si NO hay onAddPerson (modo autónomo)
    useEffect(() => {
        if (typeof onAddPerson === 'function') return; // delegamos al padre
        localStorage.setItem('peopleList', JSON.stringify(peopleList));
    }, [peopleList, onAddPerson]);

    // Manejador de cambios del formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    // Submit: crea objeto persona y lo agrega (delegado o local)
    const handleSubmit = (e) => {
        e.preventDefault();

        // Recolectar helperData y hash desde localStorage (procedencia PoC)
        const helperData = localStorage.getItem('descriptor_b64') || null;
        const hashIdentidad = localStorage.getItem('hashIdentidad') || null;

        const newPerson = {
            ...formData,
            id: Date.now(),
            helperData,
            hashIdentidad,
            offlineImageKey: data.imagenSelfie || null, // data provista por el padre (offlineKey)
            offlineImageDNIKey: data.imagenDNI || null,
        };

        // Si el padre nos dio una función, la usamos (estado centralizado)
        if (typeof onAddPerson === 'function') {
            try {
                onAddPerson(newPerson);
            } catch (err) {
                console.error('onAddPerson lanzó un error:', err);
                // fallback: guardar localmente si falla
                setPeopleList(prev => [...prev, newPerson]);
            }
        } else {
            // comportamiento legacy: guardamos localmente
            setPeopleList(prevList => [...prevList, newPerson]);
        }

        // limpiar formulario y mostrar mensaje
        setFormData(initialFormData);
        setIsSubmitted(true);
        onFormCompleted(newPerson);

        // cerrar el formulario después de un corto delay (igual que antes)
        /* setTimeout(() => {
            setIsSubmitted(false);
            if (typeof cerrarForm === 'function') cerrarForm();
        }, 1200); */
    };


    // Asumiendo que Forms.js tiene acceso a esta función
    const handleCheckboxChange = (event) => {
        const { name, value, checked } = event.target;

        // Si el campo no existe o no es un array, se usa la lógica estándar
        // Aquí es donde ajustas el formData (si usas useState, sería setFormData)
        if (checked) {
            // Añadir el valor si está marcado
            setFormData(prevData => ({
                ...prevData,
                [name]: [...prevData[name], value],
            }));
        } else {
            // Eliminar el valor si está desmarcado
            setFormData(prevData => ({
                ...prevData,
                [name]: prevData[name].filter(v => v !== value),
            }));
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #2f3d23ff', borderRadius: '8px', maxWidth: '700px', margin: 'auto', background: '#466f23' }}>
            <h2>Registro de Personas</h2><ImageDisplay offlineImageKey={data.imagenSelfie} tamaño={{ width: 60, height: 60, radius: true }} />

            {isSubmitted && (
                <p style={{ color: 'green', fontWeight: 'bold' }}>✅ ¡Persona agregada y lista guardada!</p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', paddingBottom: '20px', /* borderBottom: '1px solid #eee' */ }}>

                <label htmlFor="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />

                <label htmlFor="apellido">Apellido:</label>
                <input type="text" id="apellido" name="apellido" value={formData.apellido} onChange={handleChange} required />

                <label htmlFor="dni">DNI:</label>
                <input type="text" id="dni" name="dni" value={formData.dni} onChange={handleChange} required />

                <label htmlFor="sexo">Sexo:</label>
                <select id="sexo" name="sexo" value={formData.sexo} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="noindica">no indica</option>
                </select>

                <label htmlFor="genero">Genero:</label>
                <select id="genero" name="genero" value={formData.genero} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    <option value="cisgenero">cisgenero</option>
                    <option value="transgenero">transgenero</option>
                    <option value="intersexual">intersexual</option>
                    <option value="nobinario">no binario</option>
                </select>

                <label htmlFor="etnia">Etnia:</label>
                <select id="etnia" name="etnia" value={formData.etnia} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    <option value="qom">qom</option>
                    <option value="pilagá">pilagá</option>
                    <option value="mocoví">mocoví</option>
                    <option value="wichí">wichí</option>
                    <option value="guaraní">guaraní</option>
                    <option value="avaguaraní">ava guaraní</option>
                    <option value="chorote">chorote</option>
                    <option value="ayoreo">ayoreo</option>
                    <option value="sanapá">sanapá</option>
                    <option value="lule">lule</option>
                    <option value="vilela">vilela</option>
                    <option value="criolla">criolla</option>
                </select>

                <label htmlFor="nfamilia">Número de integrantes familia:</label>
                <input type="nfamilia" id="nfamilia" name="nfamilia" value={formData.nfamilia} onChange={handleChange} />

                <label htmlFor="fechaNacimiento">Fecha de Nacimiento:</label>
                <input type="date" id="fechaNacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />

                <label htmlFor="nivelEscolar">Nivel Escolar:</label>
                <select id="nivelEscolar" name="nivelEscolar" value={formData.nivelEscolar} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="universitario">Universitario</option>
                    <option value="posgrado">Posgrado</option>
                </select>

                <label htmlFor="zona">Zona:</label>
                <input type="text" id="zona" name="zona" value={formData.zona} onChange={handleChange} required />

                {/* Provincia */}
                <label htmlFor="provincia">Provincia:</label>
                <input type="text" id="provincia" name="provincia" value={formData.provincia} onChange={handleChange} required />

                {/* Nivel */}
                <label htmlFor="nivel">Nivel:</label>
                <select id="nivel" name="nivel" value={formData.nivel} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    {OPCIONES_NIVEL.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {/* Superficie Predio */}
                <label htmlFor="superficiePredio">Superficie predio (m2):</label>
                <input
                    type="number"
                    id="superficiePredio"
                    name="superficiePredio"
                    value={formData.superficiePredio}
                    onChange={handleChange}
                    min="0"
                    required
                />

                {/* Superficie Productiva */}
                <label htmlFor="superficieProductiva">Superficie productiva (m2):</label>
                <input
                    type="number"
                    id="superficieProductiva"
                    name="superficieProductiva"
                    value={formData.superficieProductiva}
                    onChange={handleChange}
                    min="0"
                    required
                />

                {/* Productor (Multiple Choice - Checkboxes) */}
                <label style={{ marginTop: '10px', fontWeight: 'bold' }}>Productor (selección múltiple):</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
                    {OPCIONES_PRODUCCION.map(opcion => (
                        <div key={`prod-${opcion}`}>
                            <input
                                type="checkbox"
                                id={`productor-${opcion}`}
                                name="productor"
                                value={opcion}
                                // Usamos la nueva función para checkboxes
                                onChange={handleCheckboxChange}
                                checked={formData.productor.includes(opcion)}
                            />
                            <label htmlFor={`productor-${opcion}`} style={{ fontWeight: 'normal' }}>{opcion.charAt(0).toUpperCase() + opcion.slice(1)}</label>
                        </div>
                    ))}
                </div>
                {/* Despliega para completar "otros" */}
                {formData.productor.includes('otros') && (
                    <input
                        type="text"
                        name="productorOtro"
                        placeholder="Especifica otro tipo de producción"
                        value={formData.productorOtro}
                        onChange={handleChange}
                        required
                    />
                )}

                {/* Interés en Capacitarse (Multiple Choice - Checkboxes) */}
                <label style={{ marginTop: '10px', fontWeight: 'bold' }}>Interés en capacitarse (selección múltiple):</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
                    {OPCIONES_PRODUCCION.map(opcion => (
                        <div key={`capa-${opcion}`}>
                            <input
                                type="checkbox"
                                id={`capacitacion-${opcion}`}
                                name="interesCapacitacion"
                                value={opcion}
                                // Usamos la nueva función para checkboxes
                                onChange={handleCheckboxChange}
                                checked={formData.interesCapacitacion.includes(opcion)}
                            />
                            <label htmlFor={`capacitacion-${opcion}`} style={{ fontWeight: 'normal' }}>{opcion.charAt(0).toUpperCase() + opcion.slice(1)}</label>
                        </div>
                    ))}
                </div>
                {/* Despliega para completar "otros" */}
                {formData.interesCapacitacion.includes('otros') && (
                    <input
                        type="text"
                        name="interesCapacitacionOtro"
                        placeholder="Especifica el área de capacitación"
                        value={formData.interesCapacitacionOtro}
                        onChange={handleChange}
                        required
                    />
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="submit" style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', borderRadius: 6, border: 'none', fontWeight: 700 }}>
                        Agregar Persona a la Lista
                    </button>
                    <button type="button" onClick={() => /* { setFormData(initialFormData); if (typeof cerrarForm === 'function') */ cerrarForm()/* ; } */} style={{ padding: '10px 14px' }}>
                        Cancelar
                    </button>
                </div>
            </form>
            <ImageDisplay offlineImageKey={data.imagenDNI} />
            {/*
            <h3 style={{ marginTop: '20px' }}>Personas Registradas ({peopleList.length})</h3>

             {peopleList.length === 0 ? (
                <p>Aún no hay personas registradas.</p>
            ) : (
                peopleList.map((person, index) => (
                    <div key={person.id || index} style={{ border: '1px dashed #ccc', padding: '10px', marginBottom: '8px', borderRadius: '4px' }}>
                        <p><strong>{index + 1}. {person.nombre} {person.apellido}</strong> (DNI: {person.dni})</p>
                        <p style={{ fontSize: '0.9em', margin: '2px 0' }}>Nacimiento: {person.fechaNacimiento} | Nivel: {person.nivelEscolar}</p>
                    </div>
                ))
            )}

            <details style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <summary>Ver array completo en Local Storage (JSON)</summary>
                <pre style={{ backgroundColor: '#f4f4f4', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
                    {JSON.stringify(peopleList, null, 2)}
                </pre>
            </details> */}
        </div>
    );
};

export default Forms;
