
import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const API_URL = "http://54.226.210.222:8080/api/v1/eventos";

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

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const valor = Array.isArray(fecha)
    ? new Date(
        fecha[0],
        fecha[1] - 1,
        fecha[2],
        fecha[3] || 0,
        fecha[4] || 0,
        fecha[5] || 0
      )
    : new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return String(fecha);
  }

  return valor.toLocaleString("es-CL");
}

function App() {
  const { instance, accounts, inProgress } = useMsal();

  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [eventos, setEventos] = useState([]);
  const [eventosError, setEventosError] = useState("");
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const usuario = accounts[0];

  // Carga el historial y lo actualiza cada cinco segundos.
  useEffect(() => {
    if (!usuario) {
      setEventos([]);
      setCargandoEventos(false);
      return;
    }

    let cancelado = false;

    const cargarEventos = async () => {
      try {
        const respuesta = await fetch(API_URL, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!respuesta.ok) {
          throw new Error(`El backend respondió HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
          throw new Error("La respuesta del backend no es una lista.");
        }

        if (!cancelado) {
          setEventos(datos);
          setEventosError("");
          setUltimaActualizacion(new Date());
        }
      } catch (error) {
        if (!cancelado) {
          console.error("Error al cargar eventos:", error);
          setEventosError(
            "No se pudieron cargar los eventos. Comprueba el backend, CORS y la conexión HTTP."
          );
        }
      } finally {
        if (!cancelado) {
          setCargandoEventos(false);
        }
      }
    };

    cargarEventos();

    const intervalo = setInterval(cargarEventos, 5000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [usuario]);

  const iniciarSesion = async () => {
    if (inProgress !== "none") return;

    await instance.loginRedirect(loginRequest);
  };

  const obtenerToken = async () => {
    try {
      setTokenError("");

      const resultado = await instance.acquireTokenSilent({
        ...loginRequest,
        account: usuario,
      });

      setTokenInfo({
        header: decodificarParte(resultado.accessToken, 0),
        payload: decodificarParte(resultado.accessToken, 1),
      });
    } catch (error) {
      console.error(error);
      setTokenError(
        "No se pudo obtener el token. Revisa la consola para ver el error."
      );
    }
  };

  const cerrarSesion = () => {
    instance.logoutRedirect();
  };

  const actualizarAhora = async () => {
    setCargandoEventos(true);

    try {
      const respuesta = await fetch(API_URL, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error("La respuesta no es una lista.");
      }

      setEventos(datos);
      setEventosError("");
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error(error);
      setEventosError("No se pudo actualizar el historial de eventos.");
    } finally {
      setCargandoEventos(false);
    }
  };

  const procesados = eventos.filter(
    (evento) => evento.estado === "PROCESADO"
  ).length;

  const pendientes = eventos.filter(
    (evento) => evento.estado === "PENDIENTE"
  ).length;

  if (!usuario) {
    return (
      <main style={estilos.login}>
        <h1>Cloud Native Dashboard</h1>
        <p>Inicia sesión para acceder al panel de monitoreo.</p>

        <button
          style={estilos.botonPrincipal}
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
    <main style={estilos.contenedor}>
      <header style={estilos.encabezado}>
        <div>
          <p style={estilos.subtitulo}>CLOUD NATIVE · MONITOREO</p>
          <h1 style={estilos.titulo}>Panel de control</h1>
          <p style={estilos.textoSecundario}>
            Spring Boot · RabbitMQ · MySQL / RDS
          </p>
        </div>

        <button style={estilos.botonSecundario} onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </header>

      <section style={estilos.tarjeta}>
        <h2>Sesión de Microsoft</h2>

        <div style={estilos.datosUsuario}>
          <p>
            <strong>Nombre</strong>
            <br />
            {usuario.name || "No disponible"}
          </p>

          <p>
            <strong>Cuenta</strong>
            <br />
            {usuario.username || "No disponible"}
          </p>

          <p>
            <strong>Tenant ID</strong>
            <br />
            {usuario.tenantId || "No disponible"}
          </p>
        </div>

        <button style={estilos.botonPrincipal} onClick={obtenerToken}>
          Obtener y analizar Access Token
        </button>

        {tokenError && (
          <p style={estilos.error}>{tokenError}</p>
        )}

        {tokenInfo && (
          <div style={estilos.seccionToken}>
            <h3>Header del Access Token</h3>
            <pre style={estilos.json}>
              {JSON.stringify(tokenInfo.header, null, 2)}
            </pre>

            <h3>Payload del Access Token</h3>
            <pre style={estilos.json}>
              {JSON.stringify(tokenInfo.payload, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section style={estilos.seccionEventos}>
        <div style={estilos.tituloEventos}>
          <div>
            <p style={estilos.subtitulo}>MENSAJERÍA ASÍNCRONA</p>
            <h2 style={{ margin: "4px 0" }}>Historial de eventos</h2>
            <p style={estilos.textoSecundario}>
              Eventos registrados en RDS y procesados mediante RabbitMQ.
            </p>
          </div>

          <button
            style={estilos.botonSecundario}
            onClick={actualizarAhora}
            disabled={cargandoEventos}
          >
            {cargandoEventos ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div style={estilos.resumen}>
          <div style={estilos.tarjetaResumen}>
            <span>Total de eventos</span>
            <strong>{eventos.length}</strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            <span>Procesados</span>
            <strong style={{ color: "#16a34a" }}>{procesados}</strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            <span>Pendientes</span>
            <strong style={{ color: "#d97706" }}>{pendientes}</strong>
          </div>
        </div>

        {eventosError && (
          <div style={estilos.errorCaja}>
            <strong>Error de conexión</strong>
            <p>{eventosError}</p>
            <small>
              Comprueba que el endpoint sea accesible desde el navegador.
            </small>
          </div>
        )}

        {!eventosError && eventos.length === 0 && (
          <div style={estilos.vacio}>
            {cargandoEventos
              ? "Consultando el historial..."
              : "No hay eventos registrados."}
          </div>
        )}

        {eventos.length > 0 && (
          <div style={estilos.tablaContenedor}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.celda}>ID</th>
                  <th style={estilos.celda}>Tipo</th>
                  <th style={estilos.celda}>Entidad</th>
                  <th style={estilos.celda}>Operación</th>
                  <th style={estilos.celda}>Estado</th>
                  <th style={estilos.celda}>Creación</th>
                  <th style={estilos.celda}>Procesamiento</th>
                </tr>
              </thead>

              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id}>
                    <td style={estilos.celda}>{evento.id}</td>
                    <td style={estilos.celda}>
                      {evento.tipoEvento || "—"}
                    </td>
                    <td style={estilos.celda}>
                      {evento.entidad || "—"}
                    </td>
                    <td style={estilos.celda}>
                      {evento.operacion || "—"}
                    </td>
                    <td style={estilos.celda}>
                      <span
                        style={{
                          ...estilos.estado,
                          ...(evento.estado === "PROCESADO"
                            ? estilos.estadoProcesado
                            : evento.estado === "PENDIENTE"
                              ? estilos.estadoPendiente
                              : estilos.estadoOtro),
                        }}
                      >
                        {evento.estado || "DESCONOCIDO"}
                      </span>
                    </td>
                    <td style={estilos.celda}>
                      {formatearFecha(evento.fechaCreacion)}
                    </td>
                    <td style={estilos.celda}>
                      {formatearFecha(evento.fechaProcesamiento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={estilos.textoSecundario}>
          {ultimaActualizacion
            ? `Última actualización: ${ultimaActualizacion.toLocaleTimeString("es-CL")}`
            : "Esperando la primera respuesta del backend..."}
          {" · "}Actualización automática cada 5 segundos.
        </p>
      </section>
    </main>
  );
}

const estilos = {
  contenedor: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "28px 22px",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
    color: "#e5e7eb",
    background: "#0b1120",
    minHeight: "100vh",
  },
  login: {
    maxWidth: 600,
    margin: "100px auto",
    padding: 32,
    fontFamily: "Segoe UI, Arial, sans-serif",
    textAlign: "center",
  },
  encabezado: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  titulo: {
    fontSize: 32,
    margin: "5px 0",
    color: "#f8fafc",
  },
  subtitulo: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.5,
    margin: 0,
  },
  textoSecundario: {
    color: "#94a3b8",
    fontSize: 13,
  },
  tarjeta: {
    background: "#111827",
    border: "1px solid #263449",
    borderRadius: 14,
    padding: 24,
    marginBottom: 28,
  },
  datosUsuario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 16,
    overflowWrap: "anywhere",
  },
  botonPrincipal: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  botonSecundario: {
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
  },
  seccionToken: {
    marginTop: 24,
  },
  json: {
    background: "#020617",
    color: "#cbd5e1",
    padding: 16,
    borderRadius: 8,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    border: "1px solid #1e293b",
  },
  seccionEventos: {
    background: "#111827",
    border: "1px solid #263449",
    borderRadius: 14,
    padding: 24,
  },
  tituloEventos: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  resumen: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    margin: "22px 0",
  },
  tarjetaResumen: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#0b1120",
    border: "1px solid #263449",
    borderRadius: 10,
    padding: 18,
    color: "#94a3b8",
    fontSize: 13,
  },
  error: {
    color: "#f87171",
  },
  errorCaja: {
    background: "#451a1a",
    color: "#fecaca",
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    padding: 16,
    margin: "16px 0",
  },
  vacio: {
    padding: 30,
    textAlign: "center",
    color: "#94a3b8",
    background: "#0b1120",
    borderRadius: 10,
  },
  tablaContenedor: {
    overflowX: "auto",
    width: "100%",
  },
  tabla: {
    borderCollapse: "collapse",
    width: "100%",
    textAlign: "left",
    fontSize: 13,
  },
  celda: {
    padding: "13px 12px",
    borderBottom: "1px solid #263449",
    whiteSpace: "nowrap",
  },
  estado: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  estadoProcesado: {
    background: "#052e16",
    color: "#86efac",
  },
  estadoPendiente: {
    background: "#422006",
    color: "#fcd34d",
  },
  estadoOtro: {
    background: "#1e293b",
    color: "#cbd5e1",
  },
};

export default App;