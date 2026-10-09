
import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

function decodificarParte(token, parte) {
  try {
    const segmentos = token.split(".");
    if (segmentos.length !== 3) {
      return { error: "El token no tiene formato JWT de tres partes." };
    }

    const base64 = segmentos[parte]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const texto = decodeURIComponent(
      atob(base64)
        .split("")
        .map((caracter) =>
          "%" + caracter.charCodeAt(0).toString(16).padStart(2, "0")
        )
        .join("")
    );

    return JSON.parse(texto);
  } catch {
    return { error: "No se pudo decodificar esta parte del token." };
  }
}

function App() {
  const { instance, accounts, inProgress } = useMsal();

  const [tokenInfo, setTokenInfo] = useState(null);
  const [error, setError] = useState("");

  const usuario = accounts[0];

  const iniciarSesion = async () => {
    if (inProgress !== "none") return;

    await instance.loginRedirect(loginRequest);
  };

  const obtenerToken = async () => {
    try {
      setError("");

      const resultado = await instance.acquireTokenSilent({
        ...loginRequest,
        account: usuario,
      });

      setTokenInfo({
        header: decodificarParte(resultado.accessToken, 0),
        payload: decodificarParte(resultado.accessToken, 1),
      });
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo obtener el token. Revisa la consola para ver el error."
      );
    }
  };

  const cerrarSesion = () => {
    instance.logoutRedirect();
  };

  if (!usuario) {
    return (
      <main>
        <h1>Mi aplicación</h1>
        <button
          onClick={iniciarSesion}
          disabled={inProgress !== "none"}
        >
          {inProgress === "none"
            ? "Iniciar sesión con Microsoft"
            : "Procesando..."}
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 20 }}>
      <h1>Sesión de Microsoft</h1>

      <h2>Información del usuario</h2>
      <p><strong>Nombre:</strong> {usuario.name || "No disponible"}</p>
      <p>
        <strong>Cuenta:</strong>{" "}
        {usuario.username || "No disponible"}
      </p>
      <p>
        <strong>Tenant ID:</strong>{" "}
        {usuario.tenantId || "No disponible"}
      </p>

      <button onClick={obtenerToken}>
        Obtener y analizar Access Token
      </button>

      <button onClick={cerrarSesion} style={{ marginLeft: 10 }}>
        Cerrar sesión
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {tokenInfo && (
        <>
          <h2>Header del Access Token</h2>
          <pre style={estiloJSON}>
            {JSON.stringify(tokenInfo.header, null, 2)}
          </pre>

          <h2>Payload del Access Token</h2>
          <pre style={estiloJSON}>
            {JSON.stringify(tokenInfo.payload, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}

const estiloJSON = {
  background: "#1e1e1e",
  color: "#d4d4d4",
  padding: 16,
  borderRadius: 8,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export default App;