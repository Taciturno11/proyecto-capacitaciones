import { useState, useEffect } from "react";
import ToggleTabs        from "./components/ToggleTabs";
import AsistenciasTable  from "./components/AsistenciasTable";
import EvaluacionesTable from "./components/EvaluacionesTable";
import DesercionesTable  from "./components/DesercionesTable";
import ResumenCard       from "./components/ResumenCard";
import usePostulantes    from "./hooks/usePostulantes";
import Login from "./components/Login";
import { api } from "./utils/api";

function getDniFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.dni) throw new Error('No dni');
    return payload.dni;
  } catch {
    return null;
  }
}

function getMostRecentCapa(capas) {
  if (!capas.length) return null;
  return capas.reduce((a, b) => (a.fechaInicio > b.fechaInicio ? a : b));
}

export default function App() {
  const token = localStorage.getItem('token');
  const dniCap = getDniFromToken();

  // Todos los hooks deben ir antes de cualquier return condicional
  const [capas, setCapas] = useState([]);
  const [capaSeleccionada, setCapaSeleccionada] = useState(null);
  const [vista, setVista] = useState("asist");
  const post = usePostulantes();
  const [sinDatos, setSinDatos] = useState(false);
  const [campaniaSeleccionada, setCampaniaSeleccionada] = useState("");

  // Al iniciar, busca todas las capas disponibles para el capacitador
  useEffect(() => {
    api(`/api/capas?dniCap=${dniCap}`)
      .then(data => {
        setCapas(data);
        if (data.length === 0) {
          setSinDatos(true);
          setCapaSeleccionada(null);
          setCampaniaSeleccionada("");
        } else {
          setSinDatos(false);
          // Selecciona la campaña más reciente por defecto
          const mostRecent = getMostRecentCapa(data);
          setCampaniaSeleccionada(mostRecent.campania);
          // Selecciona la capa más reciente de esa campaña
          const capasDeCamp = data.filter(c => c.campania === mostRecent.campania);
          const mostRecentCapa = getMostRecentCapa(capasDeCamp);
          setCapaSeleccionada(mostRecentCapa);
        }
      })
      .catch(() => {
        setCapas([]);
        setSinDatos(true);
        setCapaSeleccionada(null);
        setCampaniaSeleccionada("");
      });
  }, [dniCap]);

  // Cuando cambia la campaña seleccionada, selecciona la capa más reciente de esa campaña
  useEffect(() => {
    if (!campaniaSeleccionada) return;
    const capasDeCamp = capas.filter(c => c.campania === campaniaSeleccionada);
    if (capasDeCamp.length) {
      const mostRecentCapa = getMostRecentCapa(capasDeCamp);
      setCapaSeleccionada(mostRecentCapa);
    } else {
      setCapaSeleccionada(null);
    }
  }, [campaniaSeleccionada, capas]);

  // Al cambiar de capa seleccionada, carga los datos
  useEffect(() => {
    if (!capaSeleccionada) return;
    post.loadLote({
      dniCap,
      campania: capaSeleccionada.campania,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa
    });
  }, [capaSeleccionada]);

  if (!token || !dniCap) {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    return <Login />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    window.location.reload();
  };

  const guardar = () => {
    if (!capaSeleccionada) return;
    post.guardarCambios({
      dniCap,
      campania: capaSeleccionada.campania,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
      {/* Barra superior translúcida - Reducida */}
      <div className="flex justify-between items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-4">
        <div className="flex items-center gap-3">
          <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
          <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
            `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
          } 👋</span></span>
        </div>
        <button onClick={handleLogout} className="bg-gradient-to-r from-[#297373] to-[#FE7F2D] text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow hover:opacity-90 transition">Cerrar sesión</button>
      </div>
      
      {/* Contenido principal compacto */}
      <div className="w-full flex flex-col gap-1 items-start justify-start p-0 m-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 mb-3 px-4">
          {capas.length > 1 && capaSeleccionada && (
            <>
              {/* Select de campaña */}
              <select
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={campaniaSeleccionada}
                onChange={e => setCampaniaSeleccionada(e.target.value)}
              >
                {[...new Set(capas.map(c => c.campania))].map(camp => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
              {/* Select de capa/fecha */}
              <select
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={capaSeleccionada?.capa || ""}
                onChange={e => {
                  const nueva = capas.find(c => c.capa.toString() === e.target.value && c.campania === campaniaSeleccionada);
                  setCapaSeleccionada(nueva);
                }}
              >
                {capas.filter(c => c.campania === campaniaSeleccionada).map(c => (
                  <option key={c.capa} value={c.capa}>{`Capa ${c.capa} — ${c.fechaInicio}`}</option>
                ))}
              </select>
            </>
          )}
        </div>
        
        {sinDatos && (
          <div className="text-center text-gray-500 text-base mt-6">No tienes datos de asistencias para mostrar.</div>
        )}
        
        {!sinDatos && capaSeleccionada && (
          <div className="flex flex-col gap-4">
            {/* Toggle alineado a la izquierda encima de la tabla */}
            <div className="flex w-full mb-2">
              <ToggleTabs
                active={vista}
                onChange={setVista}
              />
            </div>
            {/* Contenedor de asistencias o evaluaciones */}
            <div className="rounded-lg p-2 bg-transparent flex flex-col items-start">
              {vista === "asist" && <AsistenciasTable postCtx={post} compact />}
              {vista === "eval" && <EvaluacionesTable postCtx={post} compact />}
              {vista === "asist" && (
                <div className="flex items-center gap-1 mt-1 mb-2 ml-2">
                  <button
                    onClick={guardar}
                    className="bg-[#ffb347] hover:bg-[#ffa500] text-white px-6 py-2 rounded-xl text-base font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#ffe5b4] border border-[#e0d7ce]"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
            {/* Contenedor de deserciones y resumen lado a lado */}
            <div className="flex flex-row gap-4 items-start w-full">
              <div className="inline-block rounded-lg p-2 bg-transparent">
                <DesercionesTable postCtx={post} />
              </div>
              <div className="inline-block rounded-lg p-2 bg-transparent align-top">
                <ResumenCard postCtx={post} capInfo={{
                  nombres: localStorage.getItem('nombres'),
                  apellidoPaterno: localStorage.getItem('apellidoPaterno'),
                  apellidoMaterno: localStorage.getItem('apellidoMaterno'),
                }} campania={capaSeleccionada.campania} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}