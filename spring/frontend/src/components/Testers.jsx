import { useEffect, useState } from "react";
import { obtenerTesters } from "../services/api";

function Testers() {
    const [testers, setTesters] = useState([]);

    useEffect(() => {
        obtenerTesters()
            .then(data => setTesters(data))
            .catch(error => console.error("Error:", error));
    }, []);

    return (
        <div>
            <h2>Testers</h2>

            {testers.map(tester => (
                <div key={tester.id}>
                    <p>ID: {tester.id}</p>
                    <p>Nombre: {tester.nombre}</p>
                    <hr />
                </div>
            ))}
        </div>
    );
}

export default Testers;