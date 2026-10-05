import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const API_URL = "http://54.242.125.80:8080";

function App() {
  const { instance, accounts, inProgress } = useMsal();

  console.log("Cuentas:", accounts);
  console.log("Estado:", inProgress);

  const iniciarSesion = async () => {
    try {
      if (inProgress !== "none") {
        return;
      }

      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("ERROR LOGIN:", error);
    }
  };

  const cerrarSesion = () => {
    instance.logoutRedirect();
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