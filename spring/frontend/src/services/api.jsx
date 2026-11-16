const API_URL = "http://184.197.190.98:8080";

export async function obtenerUsuarios() {
    const respuesta = await fetch(`${API_URL}/usuarios`);
    return await respuesta.json();
}

export async function obtenerTesters() {
    const respuesta = await fetch(`${API_URL}/testers`);
    return await respuesta.json();
}
