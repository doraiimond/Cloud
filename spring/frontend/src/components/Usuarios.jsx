import { useEffect, useState } from "react";
import { obtenerUsuarios } from "../services/api";

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        obtenerUsuarios()
            .then(data => setUsuarios(data))
            .catch(error => console.error("Error:", error));
    }, []);

    return (
        <div>
            <h2>Usuarios</h2>

            {usuarios.map(usuario => (
                <div key={usuario.id}>
                    <p>ID: {usuario.id}</p>
                    <p>Nombre: {usuario.nombre}</p>
                    <hr />
                </div>
            ))}
        </div>
    );
}

export default Usuarios;