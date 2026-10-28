
import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const API_BASE = "http://3.82.36.0:8080/api/v1";
const NODOS = ["rabbit@rabbit1", "rabbit@rabbit2", "rabbit@rabbit3"];

function decodificarParte(token, parte) {
  try {
    const segmentos = token.split(".");
    if (segmentos.length !== 3) {
      return { error: "El token no tiene formato JWT." };
    }

    const base64 = segmentos[parte]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const texto = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c =>
          "%" + c.charCodeAt(0).toString(16).padStart(2, "0")
        )
        .join("")
    );

    return JSON.parse(texto);
  } catch {
    return { error: "No se pudo decodificar el token." };
  }
}

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const d = Array.isArray(fecha)
    ? new Date(
        fecha[0],
        fecha[1] - 1,
        fecha[2],
        fecha[3] || 0,
        fecha[4] || 0,
        fecha[5] || 0
      )
    : new Date(fecha);

  return Number.isNaN(d.getTime())
    ? String(fecha)
    : d.toLocaleString("es-CL");
}

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    cache: "no-store",
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...opciones.headers,
    },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");

    throw new Error(
      `HTTP ${respuesta.status}${
        detalle ? `: ${detalle.slice(0, 180)}` : ""
      }`
    );
  }

  if (respuesta.status === 204) return null;

  return respuesta.json();
}

function Tabla({ columnas, filas, vacio = "Sin registros." }) {
  return (
    <div style={estilos.tablaContenedor}>
      <table style={estilos.tabla}>
        <thead>
          <tr>
            {columnas.map(columna => (
              <th key={columna} style={estilos.celda}>
                {columna}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td
                colSpan={columnas.length}
                style={estilos.celda}
              >
                {vacio}
              </td>
            </tr>
          ) : (
            filas
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const { instance, accounts, inProgress } = useMsal();
  const usuario = accounts[0];

  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [errorEventos, setErrorEventos] = useState("");
  const [errorUsuarios, setErrorUsuarios] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cantidadPrueba, setCantidadPrueba] = useState(10);
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState("");
  const [errorPrueba, setErrorPrueba] = useState("");
  const [actividadRabbit, setActividadRabbit] = useState([]);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");

  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // MONITOREO RABBITMQ
  const [nodos, setNodos] = useState([]);
  const [colas, setColas] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [bindings, setBindings] = useState([]);

  const [errorRabbit, setErrorRabbit] = useState("");
  const [cargandoRabbit, setCargandoRabbit] = useState(false);
  const [ultimaRabbit, setUltimaRabbit] = useState(null);

  async function cargarEventos(silencioso = false) {
    if (!silencioso) setCargandoEventos(true);

    try {
      const datos = await solicitar("/eventos");

      if (!Array.isArray(datos)) {
        throw new Error("La respuesta no es una lista.");
      }

      setEventos(datos);
      setErrorEventos("");
      setUltimaActualizacion(new Date());
    } catch (e) {
      setErrorEventos(
        `No se pudieron consultar los eventos: ${e.message}`
      );
    } finally {
      if (!silencioso) setCargandoEventos(false);
    }
  }

  async function cargarUsuarios() {
    setCargandoUsuarios(true);
    setMostrarUsuarios(true);

    try {
      const datos = await solicitar("/usuarios");

      if (!Array.isArray(datos)) {
        throw new Error("La respuesta no es una lista.");
      }

      setUsuarios(datos);
      setErrorUsuarios("");

      // GET /usuarios también genera un evento.
      await cargarEventos(true);
    } catch (e) {
      setErrorUsuarios(
        `No se pudieron consultar los usuarios: ${e.message}`
      );
    } finally {
      setCargandoUsuarios(false);
    }
  }

  async function crearUsuario(nuevoNombre, nuevoCorreo) {
    if (!nuevoNombre.trim() || !nuevoCorreo.trim()) {
      setMensaje("Debes indicar nombre y correo.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      await solicitar("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          correo: nuevoCorreo.trim(),
        }),
      });

      setMensaje(
        `Usuario ${nuevoNombre.trim()} creado. Evento enviado a RabbitMQ.`
      );

      setNombre("");
      setCorreo("");

      await cargarEventos(true);

      setMostrarUsuarios(false);
    } catch (e) {
      setMensaje(`Error al crear usuario: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }

  // UNA SOLA CONSULTA OBTIENE TODO EL MONITOREO.
  async function cargarRabbit(silencioso = false) {
    if (!silencioso) setCargandoRabbit(true);

    try {
      const datos = await solicitar("/rabbitmq/monitor");

      if (
        !Array.isArray(datos?.nodes) ||
        !Array.isArray(datos?.queues) ||
        !Array.isArray(datos?.exchanges) ||
        !Array.isArray(datos?.bindings)
      ) {
        throw new Error(
          "El backend devolvió un formato inesperado."
        );
      }

      setNodos(datos.nodes);
      setColas(datos.queues);
      setExchanges(datos.exchanges);
      setBindings(datos.bindings);

      setErrorRabbit("");
      setUltimaRabbit(new Date());
      // Guardamos muestras de tasas reales para visualizar actividad reciente.
      const exchangesApp = datos.exchanges.filter(x => x.name && !x.internal && !x.name.startsWith("amq."));
      const publicados = exchangesApp.reduce((s, x) => s + (x.message_stats?.publish_in_details?.rate ?? 0), 0);
      const confirmados = datos.queues.reduce((s, q) => s + (q.message_stats?.ack_details?.rate ?? 0), 0);
      setActividadRabbit(prev => [...prev.slice(-29), {
        hora: new Date().toLocaleTimeString("es-CL"), publicados, confirmados
      }]);
    } catch (e) {
      setErrorRabbit(
        `No se pudo consultar RabbitMQ: ${e.message}`
      );
    } finally {
      if (!silencioso) setCargandoRabbit(false);
    }
  }

  useEffect(() => {
    if (!usuario) return;

    cargarEventos();
    cargarRabbit();

    const intervaloEventos = setInterval(
      () => cargarEventos(true),
      5000
    );

    const intervaloRabbit = setInterval(
      () => cargarRabbit(true),
      15000
    );

    return () => {
      clearInterval(intervaloEventos);
      clearInterval(intervaloRabbit);
    };
  }, [usuario?.homeAccountId]);

  async function generarMensajesPrueba() {
    setEnviandoPrueba(true);
    setErrorPrueba("");
    setResultadoPrueba("");
    try {
      const cantidad = Number(cantidadPrueba);
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
        throw new Error("La cantidad debe estar entre 1 y 100.");
      }
      // Requiere implementar este endpoint en Spring Boot.
      const respuesta = await solicitar("/rabbitmq/test", {
        method: "POST",
        body: JSON.stringify({ cantidad }),
      });
      setResultadoPrueba(respuesta?.mensaje || `Solicitud de ${cantidad} mensajes aceptada por el backend. Comprueba las métricas para verificar su publicación y consumo.`);
      await cargarRabbit();
      await cargarEventos(true);
    } catch (e) {
      setErrorPrueba(`No se pudieron generar mensajes: ${e.message}. Comprueba que POST /api/v1/rabbitmq/test exista en Spring Boot.`);
    } finally {
      setEnviandoPrueba(false);
    }
  }

  async function obtenerToken() {
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
    } catch (e) {
      console.error(e);
      setTokenError("No se pudo obtener el token.");
    }
  }

  const procesados = eventos.filter(
    e => e.estado === "PROCESADO"
  ).length;

  const pendientes = eventos.filter(
    e => e.estado === "PENDIENTE"
  ).length;

  const nodosActivos = nodos.filter(
    n => n.running === true
  ).length;

  const mensajesPendientes = colas.reduce(
    (total, cola) => total + (cola.messages_ready ?? 0),
    0
  );

  const mensajesEnProceso = colas.reduce(
    (total, cola) =>
      total + (cola.messages_unacknowledged ?? 0),
    0
  );

  const consumidores = colas.reduce(
    (total, cola) => total + (cola.consumers ?? 0),
    0
  );

  // Ocultamos exchanges internos de RabbitMQ.
  const exchangesAplicacion = exchanges.filter(
    exchange =>
      exchange.name &&
      !exchange.internal &&
      !exchange.name.startsWith("amq.")
  );

  // Ocultamos bindings automáticos hacia la exchange por defecto.
  const bindingsAplicacion = bindings.filter(
    binding =>
      binding.source &&
      !binding.source.startsWith("amq.")
  );

  const publicacionesPorSegundo = exchangesAplicacion.reduce(
    (s, x) => s + (x.message_stats?.publish_in_details?.rate ?? 0), 0
  );
  const ackPorSegundo = colas.reduce(
    (s, q) => s + (q.message_stats?.ack_details?.rate ?? 0), 0
  );
  const entregasPorSegundo = colas.reduce(
    (s, q) => s + (q.message_stats?.deliver_get_details?.rate ?? 0), 0
  );
  const publicadosAcumulados = exchangesAplicacion.reduce(
    (s, x) => s + (x.message_stats?.publish_in ?? 0), 0
  );
  const ackAcumulados = colas.reduce(
    (s, q) => s + (q.message_stats?.ack ?? 0), 0
  );
  const hayMetricasPublicacion = exchangesAplicacion.some(x => typeof x.message_stats?.publish_in === "number");
  const hayMetricasAck = colas.some(q => typeof q.message_stats?.ack === "number");

  if (!usuario) {
    return (
      <main style={estilos.login}>
        <h1>Cloud Native Dashboard</h1>
        <p>
          Inicia sesión para acceder al panel de monitoreo.
        </p>

        <button
          style={estilos.botonPrincipal}
          disabled={inProgress !== "none"}
          onClick={() =>
            instance.loginRedirect(loginRequest)
          }
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
          <p style={estilos.subtitulo}>
            CLOUD NATIVE · MONITOREO
          </p>

          <h1 style={estilos.titulo}>
            Panel de control
          </h1>

          <p style={estilos.textoSecundario}>
            Microsoft Entra ID · Spring Boot · RabbitMQ · MySQL RDS
          </p>
        </div>

        <button
          style={estilos.botonSecundario}
          onClick={() => instance.logoutRedirect()}
        >
          Cerrar sesión
        </button>
      </header>

      {/* MICROSOFT ENTRA ID */}
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

        <div style={estilos.acciones}>
          <button
            style={estilos.botonPrincipal}
            onClick={obtenerToken}
          >
            Obtener y analizar Access Token
          </button>

          <button
            style={estilos.botonSecundario}
            disabled={guardando}
            onClick={() =>
              crearUsuario(
                usuario.name || usuario.username,
                usuario.username
              )
            }
          >
            Registrar mi cuenta en RDS
          </button>
        </div>

        {tokenError && (
          <p style={estilos.error}>{tokenError}</p>
        )}

        {tokenInfo && (
          <div style={{ marginTop: 20 }}>
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

      {/* CLÚSTER RABBITMQ */}
      <section style={estilos.tarjeta}>
        <div style={estilos.encabezadoSeccion}>
          <div>
            <p style={estilos.subtitulo}>
              INFRAESTRUCTURA AWS
            </p>
            <h2>Clúster RabbitMQ</h2>
          </div>

          <button
            style={estilos.botonSecundario}
            disabled={cargandoRabbit}
            onClick={() => cargarRabbit()}
          >
            {cargandoRabbit
              ? "Consultando..."
              : "Actualizar RabbitMQ"}
          </button>
        </div>

        {errorRabbit && (
          <p style={estilos.error}>{errorRabbit}</p>
        )}

        <div style={estilos.resumen}>
          <div style={estilos.tarjetaResumen}>
            Nodos activos
            <strong style={{ color: "#86efac" }}>
              {nodosActivos}/{NODOS.length}
            </strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Colas
            <strong>{colas.length}</strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Mensajes pendientes
            <strong style={{ color: "#fbbf24" }}>
              {mensajesPendientes}
            </strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Mensajes sin ACK
            <strong>{mensajesEnProceso}</strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Consumidores
            <strong>{consumidores}</strong>
          </div>
        </div>

        <h3>Estado de los nodos</h3>

        <div style={estilos.nodos}>
          {NODOS.map(nombreNodo => {
            const info = nodos.find(
              n => n.name === nombreNodo
            );

            const estado =
              typeof info?.running === "boolean"
                ? info.running
                  ? "Activo"
                  : "Inactivo"
                : "Sin verificar";

            return (
              <div
                key={nombreNodo}
                style={estilos.nodo}
              >
                <div style={{ fontSize: 26 }}>▣</div>

                <strong>
                  {nombreNodo.replace("rabbit@", "")}
                </strong>

                <span
                  style={{
                    color:
                      estado === "Activo"
                        ? "#86efac"
                        : estado === "Inactivo"
                        ? "#fca5a5"
                        : "#fbbf24",
                  }}
                >
                  {estado}
                </span>

                <small style={estilos.textoSecundario}>
                  {info?.type || "Nodo RabbitMQ"}
                </small>
              </div>
            );
          })}
        </div>

        <p style={estilos.textoSecundario}>
          {ultimaRabbit
            ? `Última consulta: ${ultimaRabbit.toLocaleTimeString("es-CL")}`
            : "Esperando primera consulta..."}
          {" · "}
          Actualización automática cada 15 segundos.
        </p>
      </section>

      {/* COLAS RABBITMQ */}
      <section style={estilos.tarjeta}>
        <p style={estilos.subtitulo}>
          RABBITMQ · MENSAJERÍA
        </p>

        <h2>Colas del clúster</h2>

        <p style={estilos.textoSecundario}>
          Mensajes y consumidores obtenidos desde RabbitMQ Management.
        </p>

        <Tabla
          columnas={[
            "Cola",
            "Tipo",
            "Estado",
            "Pendientes",
            "Sin ACK",
            "Total",
            "Consumidores",
            "Nodo líder",
          ]}
          filas={colas.map((cola, i) => (
            <tr key={`${cola.vhost}-${cola.name}-${i}`}>
              <td style={estilos.celda}>
                <strong>{cola.name}</strong>
              </td>

              <td style={estilos.celda}>
                {cola.type ||
                  cola.arguments?.["x-queue-type"] ||
                  "classic"}
              </td>

              <td style={estilos.celda}>
                <span
                  style={{
                    ...estilos.estado,
                    color:
                      cola.state === "running"
                        ? "#86efac"
                        : "#fbbf24",
                  }}
                >
                  {cola.state || "No disponible"}
                </span>
              </td>

              <td style={estilos.celda}>
                {cola.messages_ready ?? 0}
              </td>

              <td style={estilos.celda}>
                {cola.messages_unacknowledged ?? 0}
              </td>

              <td style={estilos.celda}>
                {cola.messages ?? 0}
              </td>

              <td style={estilos.celda}>
                {cola.consumers ?? 0}
              </td>

              <td style={estilos.celda}>
                {cola.leader ||
                  cola.node ||
                  "No disponible"}
              </td>
            </tr>
          ))}
        />
      </section>

      {/* EXCHANGES */}
      <section style={estilos.tarjeta}>
        <p style={estilos.subtitulo}>
          RABBITMQ · ENRUTAMIENTO
        </p>

        <h2>Exchanges</h2>

        <Tabla
          columnas={[
            "Exchange",
            "Tipo",
            "Durable",
            "Auto-delete",
          ]}
          filas={exchangesAplicacion.map((exchange, i) => (
            <tr key={`${exchange.vhost}-${exchange.name}-${i}`}>
              <td style={estilos.celda}>
                <strong>{exchange.name}</strong>
              </td>

              <td style={estilos.celda}>
                {exchange.type || "—"}
              </td>

              <td style={estilos.celda}>
                {exchange.durable ? "Sí" : "No"}
              </td>

              <td style={estilos.celda}>
                {exchange.auto_delete ? "Sí" : "No"}
              </td>
            </tr>
          ))}
        />
      </section>

      {/* BINDINGS */}
      <section style={estilos.tarjeta}>
        <p style={estilos.subtitulo}>
          RABBITMQ · RUTAS
        </p>

        <h2>Bindings</h2>

        <p style={estilos.textoSecundario}>
          Relaciones entre exchanges y colas, incluyendo las routing keys.
        </p>

        <Tabla
          columnas={[
            "Exchange origen",
            "Destino",
            "Tipo destino",
            "Routing key",
          ]}
          filas={bindingsAplicacion.map((binding, i) => (
            <tr
              key={
                binding.properties_key ||
                `${binding.source}-${binding.destination}-${i}`
              }
            >
              <td style={estilos.celda}>
                {binding.source || "—"}
              </td>

              <td style={estilos.celda}>
                <strong>
                  {binding.destination || "—"}
                </strong>
              </td>

              <td style={estilos.celda}>
                {binding.destination_type || "—"}
              </td>

              <td style={estilos.celda}>
                {binding.routing_key || "—"}
              </td>
            </tr>
          ))}
        />
      </section>

      {/* DEMOSTRACIÓN DE MENSAJERÍA REAL */}
      <section style={estilos.tarjeta}>
        <p style={estilos.subtitulo}>RABBITMQ · DEMOSTRACIÓN</p>
        <h2>Centro de pruebas de mensajería</h2>
        <p style={estilos.textoSecundario}>
          Genera mensajes desde Spring Boot y observa las estadísticas reales del broker.
          El endpoint de prueba debe existir en el backend para habilitar el envío.
        </p>
        <div style={estilos.acciones}>
          <label style={{ color: "#cbd5e1", fontSize: 13 }}>
            Cantidad de mensajes
            <select style={{ ...estilos.input, minWidth: 160 }} value={cantidadPrueba}
              onChange={e => setCantidadPrueba(Number(e.target.value))}>
              {[1, 10, 50, 100].map(n => <option key={n} value={n}>{n} mensaje{n === 1 ? "" : "s"}</option>)}
            </select>
          </label>
          <button style={{ ...estilos.botonPrincipal, alignSelf: "end" }}
            type="button" disabled={enviandoPrueba} onClick={generarMensajesPrueba}>
            {enviandoPrueba ? "Enviando..." : "Generar mensajes"}
          </button>
          <button style={{ ...estilos.botonSecundario, alignSelf: "end" }}
            type="button" onClick={() => cargarRabbit()} disabled={cargandoRabbit}>
            Actualizar métricas
          </button>
        </div>
        {resultadoPrueba && <p style={{ color: "#86efac" }} role="status">{resultadoPrueba}</p>}
        {errorPrueba && <p style={estilos.error} role="alert">{errorPrueba}</p>}
        <div style={estilos.resumen}>
          {[
            ["Publicados (acumulado)", hayMetricasPublicacion ? publicadosAcumulados : "—"],
            ["ACK (acumulado)", hayMetricasAck ? ackAcumulados : "—"],
            ["Publicaciones / s", publicacionesPorSegundo.toFixed(2)],
            ["Entregas / s", entregasPorSegundo.toFixed(2)],
            ["ACK / s", ackPorSegundo.toFixed(2)],
            ["Consumidores", consumidores],
          ].map(([titulo, valor]) => (
            <div style={estilos.tarjetaResumen} key={titulo}>
              {titulo}<strong style={{ fontSize: 23, color: "#e5e7eb" }}>{valor}</strong>
            </div>
          ))}
        </div>
        <h3>Actividad reciente (últimas 30 consultas)</h3>
        <div style={{ display: "flex", alignItems: "end", gap: 3, height: 110, padding: "10px 0", borderBottom: "1px solid #334155" }}>
          {actividadRabbit.map((m, i) => {
            const maximo = Math.max(1, ...actividadRabbit.flatMap(x => [x.publicados, x.confirmados]));
            return <div key={i} title={`${m.hora}: ${m.publicados.toFixed(2)} publicados/s; ${m.confirmados.toFixed(2)} ACK/s`}
              style={{ display: "flex", alignItems: "end", gap: 1, flex: 1, height: "100%" }}>
              <div style={{ flex: 1, height: `${Math.max(2, 100 * m.publicados / maximo)}%`, background: "#60a5fa", borderRadius: "3px 3px 0 0" }} />
              <div style={{ flex: 1, height: `${Math.max(2, 100 * m.confirmados / maximo)}%`, background: "#86efac", borderRadius: "3px 3px 0 0" }} />
            </div>;
          })}
        </div>
        <p style={estilos.textoSecundario}>
          <span style={{ color: "#60a5fa" }}>■</span> Publicaciones/s · <span style={{ color: "#86efac" }}>■</span> ACK/s.
          Las tasas pueden volver a cero tras procesar los mensajes. Los contadores acumulados dependen de las estadísticas que entregue Management y pueden reiniciarse.
        </p>
      </section>

      {/* GESTIÓN DE USUARIOS */}
      <section style={estilos.tarjeta}>
        <p style={estilos.subtitulo}>
          PRODUCCIÓN DE EVENTOS
        </p>

        <h2>Gestión de usuarios</h2>

        <form
          onSubmit={e => {
            e.preventDefault();
            crearUsuario(nombre, correo);
          }}
          style={estilos.formulario}
        >
          <label>
            Nombre
            <input
              style={estilos.input}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre del usuario"
              required
            />
          </label>

          <label>
            Correo electrónico
            <input
              style={estilos.input}
              type="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              placeholder="usuario@correo.com"
              required
            />
          </label>

          <button
            style={estilos.botonPrincipal}
            disabled={guardando}
            type="submit"
          >
            {guardando ? "Guardando..." : "Crear usuario"}
          </button>
        </form>

        {mensaje && (
          <p style={estilos.aviso} role="status">
            {mensaje}
          </p>
        )}

        <div style={estilos.acciones}>
          <button
            style={estilos.botonSecundario}
            disabled={cargandoUsuarios}
            onClick={cargarUsuarios}
          >
            {cargandoUsuarios
              ? "Consultando..."
              : "Consultar usuarios (genera evento)"}
          </button>

          <button
            style={estilos.botonSecundario}
            disabled={cargandoEventos}
            onClick={() => cargarEventos()}
          >
            Consultar eventos
          </button>
        </div>

        {errorUsuarios && (
          <p style={estilos.error}>{errorUsuarios}</p>
        )}

        {mostrarUsuarios && (
          <>
            <h3>Usuarios en RDS ({usuarios.length})</h3>

            <Tabla
              columnas={["ID", "Nombre", "Correo"]}
              filas={usuarios.map((u, i) => (
                <tr key={u.id ?? i}>
                  <td style={estilos.celda}>
                    {u.id ?? "—"}
                  </td>
                  <td style={estilos.celda}>
                    {u.nombre ?? "—"}
                  </td>
                  <td style={estilos.celda}>
                    {u.correo ?? "—"}
                  </td>
                </tr>
              ))}
            />
          </>
        )}
      </section>

      {/* HISTORIAL DE EVENTOS */}
      <section style={estilos.tarjeta}>
        <div style={estilos.encabezadoSeccion}>
          <div>
            <p style={estilos.subtitulo}>
              MENSAJERÍA ASÍNCRONA
            </p>

            <h2>Historial de eventos</h2>
            <button type="button" style={estilos.botonSecundario}
              onClick={() => setMostrarHistorial(v => !v)}>
              {mostrarHistorial ? "Ocultar historial" : "Mostrar historial"}
            </button>

            <p style={estilos.textoSecundario}>
              Eventos almacenados en RDS y procesados mediante RabbitMQ.
            </p>
          </div>

          <button
            style={estilos.botonSecundario}
            disabled={cargandoEventos}
            onClick={() => cargarEventos()}
          >
            {cargandoEventos
              ? "Actualizando..."
              : "Actualizar"}
          </button>
        </div>

        <div style={estilos.resumen}>
          <div style={estilos.tarjetaResumen}>
            Total de eventos
            <strong>{eventos.length}</strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Procesados
            <strong style={{ color: "#86efac" }}>
              {procesados}
            </strong>
          </div>

          <div style={estilos.tarjetaResumen}>
            Pendientes
            <strong style={{ color: "#fbbf24" }}>
              {pendientes}
            </strong>
          </div>
        </div>

        {errorEventos && (
          <p style={estilos.error}>{errorEventos}</p>
        )}

        {mostrarHistorial && (
        <Tabla
          columnas={[
            "ID",
            "Tipo",
            "Entidad",
            "Operación",
            "Estado",
            "Creación",
            "Procesamiento",
          ]}
          filas={eventos.map(evento => (
            <tr key={evento.id}>
              <td style={estilos.celda}>
                {evento.id}
              </td>

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
                    color:
                      evento.estado === "PROCESADO"
                        ? "#86efac"
                        : "#fbbf24",
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
        />

        )}

        <p style={estilos.textoSecundario}>
          {ultimaActualizacion
            ? `Última actualización: ${ultimaActualizacion.toLocaleTimeString("es-CL")}`
            : "Esperando respuesta..."}
          {" · "}
          Actualización automática cada 5 segundos.
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

  encabezadoSeccion: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
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
    marginBottom: 24,
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

  acciones: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
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

  nodos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 16,
  },

  nodo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "18px 6px",
    background: "#0b1120",
    border: "1px solid #263449",
    borderRadius: 10,
    fontSize: 13,
  },

  formulario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
    alignItems: "end",
    marginTop: 16,
  },

  input: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    marginTop: 8,
    background: "#0b1120",
    color: "#f8fafc",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: 12,
  },

  aviso: {
    color: "#fbbf24",
    fontSize: 13,
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
    color: "#fca5a5",
    overflowWrap: "anywhere",
  },

  tablaContenedor: {
    overflowX: "auto",
    width: "100%",
    marginTop: 18,
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
    background: "#1e293b",
    fontSize: 11,
    fontWeight: 700,
  },
};
