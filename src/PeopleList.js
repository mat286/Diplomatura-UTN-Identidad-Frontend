import { useState } from "react";
import ImageDisplay from "./ImageDisplay";
import "./PeopleList.css";


// --- Función auxiliar para obtener peopleList desde Local Storage ---
const getInitialPeople = () => {
    const savedPeople = localStorage.getItem('peopleList');
    try {
        return savedPeople ? JSON.parse(savedPeople) : [];
    } catch (error) {
        console.error("Error al parsear 'peopleList' del Local Storage:", error);
        return [];
    }
};


const PeopleList = () => {
    const [peopleList] = useState(getInitialPeople);
    return (
        <div className="card">
            <h2 className="card-title">Lista de Personas Registradas <span className="muted">({peopleList.length})</span></h2>

            {peopleList.length === 0 ? (
                <div className="alert warning">
                    Aún no hay personas registradas. ¡Ve a la pestaña de registro para agregar la primera!
                </div>
            ) : (
                <div className="list">
                    {peopleList.map((person, index) => (
                        <div key={person.id || index} className="list-item">
                            <div className="person-main">
                                <div className="person-name">{index + 1}. {person.nombre} {person.apellido}</div>
                                <ImageDisplay offlineImageKey={person.offlineImageKey} tamaño={{ width: 60, height: 60, radius: true }} />
                            </div>

                            <div className="person-meta">
                                <div>📅 {person.fechaNacimiento || '-'}</div>
                                <div>🎓 {person.nivelEscolar || '-'}</div>
                                <div>📧 {person.email || '-'}</div><div className="person-dni">DNI: {person.dni || '-'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

};

export default PeopleList;