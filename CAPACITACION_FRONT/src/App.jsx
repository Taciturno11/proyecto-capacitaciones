import React, { useRef, useState, useEffect } from "react";
import ToggleTabs        from "./components/ToggleTabs";
import AsistenciasTable  from "./components/AsistenciasTable";
import EvaluacionesTable from "./components/EvaluacionesTable";
import DesercionesTable  from "./components/DesercionesTable";
import ResumenCard       from "./components/ResumenCard";
import usePostulantes    from "./hooks/usePostulantes";
import Login from "./components/Login";
import { api } from "./utils/api";
import { createPortal } from "react-dom";
import { descargarExcel } from "./utils/excel";

function getDniFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.dni) throw new Error('No dni');
    return payload.dni;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    // Limpiar token inválido
    localStorage.removeItem('token');
    localStorage.removeItem('nombres');
    localStorage.removeItem('apellidoPaterno');
    localStorage.removeItem('apellidoMaterno');
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
  const [showResumen, setShowResumen] = useState(false);
  const resumenBtnRef = useRef(null);
  const resumenPopoverRef = useRef(null);
  const [resumenPos, setResumenPos] = useState({ top: 80, left: window.innerWidth / 2 });

  // Cerrar el popover al hacer clic fuera
  useEffect(() => {
    if (!showResumen) return;
    function handleClick(e) {
      if (
        resumenPopoverRef.current &&
        !resumenPopoverRef.current.contains(e.target) &&
        resumenBtnRef.current &&
        !resumenBtnRef.current.contains(e.target)
      ) {
        setShowResumen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResumen]);

  // Al iniciar, busca todas las capas disponibles para el capacitador
  useEffect(() => {
    if (!dniCap) return; // No hacer la llamada si no hay DNI válido
    
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

  useEffect(() => {
    if (showResumen && resumenBtnRef.current) {
      const rect = resumenBtnRef.current.getBoundingClientRect();
      setResumenPos({
        top: rect.bottom + 8 + window.scrollY, // 8px de margen
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  }, [showResumen]);

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
      {/* Barra superior translúcida - Toggle alineado a la derecha del saludo */}
      <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 60 }}>
        {/* Logo y saludo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
          <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
            `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
          } 👋</span></span>
        </div>
        {/* ToggleTabs y Ver Resumen juntos, centrados */}
        <div className="absolute left-[47%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
          <ToggleTabs active={vista} onChange={setVista} />
          <button
            ref={resumenBtnRef}
            onClick={() => setShowResumen(v => !v)}
            className="ml-8 px-4 py-1.5 rounded-full bg-white/80 text-[#297373] font-semibold shadow hover:bg-white transition border border-[#e0d7ce] focus:outline-none"
          >
            Ver Resumen
          </button>
          {/* Indicadores de bajas y activos a la derecha del botón */}
          <div className="flex items-center gap-2 ml-4">
            {/* Activos primero */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-semibold mb-1">Activos</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold text-lg">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 16V6m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {post.tablaDatos.length - post.deserciones.length}
                <span className="text-xs text-emerald-500 font-semibold ml-1">
                  {post.tablaDatos.length > 0 ? Math.round(((post.tablaDatos.length - post.deserciones.length) / post.tablaDatos.length) * 100) : 0}%
                </span>
              </span>
            </div>
            {/* Bajas después */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-semibold mb-1">Bajas</span>
              <span className="flex items-center gap-1 text-rose-600 font-bold text-lg">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {post.deserciones.length}
                <span className="text-xs text-rose-600 font-semibold ml-1">
                  {post.tablaDatos.length > 0 ? Math.round((post.deserciones.length / post.tablaDatos.length) * 100) : 0}%
                </span>
              </span>
            </div>
          </div>
        </div>
        {/* Botón cerrar sesión a la derecha */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <button onClick={handleLogout} className="bg-gradient-to-r from-[#297373] to-[#FE7F2D] text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow hover:opacity-90 transition">Cerrar sesión</button>
        </div>
      </div>
      {/* Contenido principal compacto */}
      <div className="w-full flex flex-col gap-1 items-start justify-start p-0 m-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 mb-1 px-4">
          {capas.length > 1 && capaSeleccionada && (
            <>
              {/* Select de campaña */}
              <select
                style={{ backgroundColor: '#dbeafe' }}
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
                style={{ backgroundColor: '#dbeafe' }}
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
          <div className="flex flex-col gap-2">
            {/* Contenedor de asistencias o evaluaciones */}
            <div className="flex flex-row gap-4 items-start w-full">
              <div
                className="flex-1 rounded-lg p-2 bg-transparent"
                style={{}}
              >
                {vista === "asist" && <AsistenciasTable
                  postCtx={post}
                  compact
                  dniCap={dniCap}
                  campania={campaniaSeleccionada}
                  mes={capaSeleccionada?.fechaInicio?.slice(0, 7)}
                  fechaInicio={capaSeleccionada?.fechaInicio}
                  capaNum={capaSeleccionada?.capa}
                />}
                {vista === "eval" && <EvaluacionesTable postCtx={post} compact />}
                {(vista === "asist" || vista === "eval") && (
                  <div className="flex items-center gap-1 mt-1 mb-2 ml-2">
                    <button
                      onClick={guardar}
                      className="bg-[#ffb347] hover:bg-[#ffa500] text-white px-6 py-2 rounded-xl text-base font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#ffe5b4] border border-[#e0d7ce]"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => descargarExcel({ tablaDatos: post.tablaDatos, dias: post.dias, capCount: post.capCount })}
                      className="bg-blue-400 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-base font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 border border-blue-200 ml-2"
                    >
                      Descargar Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Tabla de deserciones siempre debajo */}
            <div className="inline-block rounded-lg p-2 bg-transparent w-full">
              <DesercionesTable postCtx={post} />
            </div>
          </div>
        )}
        {showResumen && createPortal(
          <div
            ref={resumenPopoverRef}
            className="z-[999] w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200 p-0"
            style={{ position: 'fixed', top: resumenPos.top, left: resumenPos.left, transform: 'translateX(-50%)' }}
          >
            <div className="flex items-center justify-between px-6 pt-4 pb-0">
              <span className="text-2xl font-bold text-gray-800">Resumen</span>
              <button
                onClick={() => setShowResumen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <ResumenCard postCtx={post} capInfo={{
              nombres: localStorage.getItem('nombres'),
              apellidoPaterno: localStorage.getItem('apellidoPaterno'),
              apellidoMaterno: localStorage.getItem('apellidoMaterno'),
            }} campania={capaSeleccionada?.campania} hideTitle />
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}