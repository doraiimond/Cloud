import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const API_URL = "http://13.221.125.68:8080";

function App() {
  const { instance, accounts, inProgress } = useMsal();

  const iniciarSesion = async () => {
    if (inProgress !== "none") {
      return;
    }

    try {
      const response = await instance.loginPopup(loginRequest);

      const usuario = {
        nombre: response.account.name
      };

      await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(usuario)
      });

      console.log("Usuario guardado:", usuario);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const cerrarSesion = () => {
    instance.logoutPopup();
  };

  if (accounts.length === 0) {
    return (
      <div>
        <h1>Mi aplicación</h1>

        <button
          onClick={iniciarSesion}
          disabled={inProgress !== "none"}
        >
          {inProgress === "none"
            ? "Iniciar sesión con Microsoft"
            : "Iniciando sesión..."}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Hola, {accounts[0].name}</h1>

      <button onClick={cerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default App;