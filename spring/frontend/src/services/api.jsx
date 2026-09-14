const API_URL = "http://13.221.125.68:8080";

export async function obtenerUsuarios() {
    const respuesta = await fetch(`${API_URL}/usuarios`);
    return await respuesta.json();
}

export async function obtenerTesters() {
    const respuesta = await fetch(`${API_URL}/testers`);
    return await respuesta.json();
}