import React, { useState, useEffect } from 'react';

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
    dni: '',
    nivelEscolar: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
};

const Forms = ({ cerrarForm, onAddPerson } = {}) => {
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

        // cerrar el formulario después de un corto delay (igual que antes)
        setTimeout(() => {
            setIsSubmitted(false);
            if (typeof cerrarForm === 'function') cerrarForm();
        }, 1200);
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '700px', margin: 'auto', background: '#fff' }}>
            <h2>Registro de Personas</h2>

            {isSubmitted && (
                <p style={{ color: 'green', fontWeight: 'bold' }}>✅ ¡Persona agregada y lista guardada!</p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
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
                    <option value="otro">Otro</option>
                </select>

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

                <label htmlFor="email">Email (opcional):</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />

                <label htmlFor="telefono">Teléfono (opcional):</label>
                <input type="tel" id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} />

                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="submit" style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', borderRadius: 6, border: 'none', fontWeight: 700 }}>
                        Agregar Persona a la Lista
                    </button>
                    <button type="button" onClick={() => { setFormData(initialFormData); if (typeof cerrarForm === 'function') cerrarForm(); }} style={{ padding: '10px 14px' }}>
                        Cancelar
                    </button>
                </div>
            </form>

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
            </details>
        </div>
    );
};

export default Forms;
