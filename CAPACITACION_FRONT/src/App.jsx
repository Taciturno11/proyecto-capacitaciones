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
import DashboardCoordinadora from "./components/DashboardCoordinadora";
import UserAvatar from "./components/UserAvatar";
import TiendaMarcos from "./components/TiendaMarcos";
import RuletaPuntos from "./components/RuletaPuntos";

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
  const rol = localStorage.getItem('rol');

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
  const [showTienda, setShowTienda] = useState(false);
  const [marcoSeleccionado, setMarcoSeleccionado] = useState('marco1.png');
  const [showRuleta, setShowRuleta] = useState(false);

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
          setCampaniaSeleccionada(mostRecent.CampañaID);
          // Selecciona la capa más reciente de esa campaña
          const capasDeCamp = data.filter(c => c.CampañaID === mostRecent.CampañaID);
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
    console.log("[App.jsx] campaniaSeleccionada:", campaniaSeleccionada);
    console.log("[App.jsx] capas:", capas);
    const capasDeCamp = capas.filter(c => c.CampañaID === campaniaSeleccionada);
    console.log("[App.jsx] capasDeCamp:", capasDeCamp);
    if (!campaniaSeleccionada) return;
    if (capasDeCamp.length) {
      const mostRecentCapa = getMostRecentCapa(capasDeCamp);
      setCapaSeleccionada(mostRecentCapa);
      console.log("[App.jsx] setCapaSeleccionada:", mostRecentCapa);
    } else {
      setCapaSeleccionada(null);
      console.log("[App.jsx] setCapaSeleccionada: null");
    }
  }, [campaniaSeleccionada, capas]);

  // Al cambiar de capa seleccionada, carga los datos
  useEffect(() => {
    console.log("[App.jsx] capaSeleccionada actual:", capaSeleccionada);
    if (!capaSeleccionada) return;
    console.log("Llamando a loadLote con:", {
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa
    });
    post.loadLote({
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa
    });
  }, [capaSeleccionada]);

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

  if (rol === "coordinadora") {
    return <DashboardCoordinadora />;
  }

  const handleLogout = () => {
    console.log('Función handleLogout ejecutada');
    localStorage.removeItem('token');
    localStorage.removeItem('nombres');
    localStorage.removeItem('apellidoPaterno');
    localStorage.removeItem('apellidoMaterno');
    localStorage.removeItem('rol');
    console.log('localStorage limpiado, recargando página...');
    window.location.reload();
  };

  const guardar = () => {
    if (!capaSeleccionada) return;
    post.guardarCambios({
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa
    });
  };

  // Filtrar deserciones únicas para el resumen (por dni+fecha+capa_numero)
  const desercionesUnicas = [];
  const seen = new Set();
  for (const d of post.deserciones) {
    const key = `${d.postulante_dni}-${d.fecha_desercion}-${d.capa_numero || ''}`;
    if (!seen.has(key)) {
      desercionesUnicas.push(d);
      seen.add(key);
    }
  }
  const bajas = desercionesUnicas.length;
  const activos = post.tablaDatos.length - bajas;
  const porcentajeBajas = post.tablaDatos.length > 0 ? Math.round((bajas / post.tablaDatos.length) * 100) : 0;
  const porcentajeActivos = post.tablaDatos.length > 0 ? Math.round((activos / post.tablaDatos.length) * 100) : 0;

  if (showRuleta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
        <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
          {/* Logo y saludo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
            <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
              `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
            } 👋</span></span>
          </div>
          {/* Avatar de usuario en la esquina superior derecha */}
          <div className="ml-auto flex items-center">
            <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
          </div>
        </div>
        <RuletaPuntos onClose={() => setShowRuleta(false)} />
      </div>
    );
  }
  if (showTienda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
        <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
          {/* Logo y saludo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
            <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
              `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
            } 👋</span></span>
          </div>
          {/* Avatar de usuario en la esquina superior derecha */}
          <div className="ml-auto flex items-center">
            <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
          </div>
        </div>
        <TiendaMarcos
          onClose={() => setShowTienda(false)}
          onSelectMarco={(file) => {
            setMarcoSeleccionado(file);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
      {/* Barra superior translúcida - Toggle alineado a la derecha del saludo */}
      <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
        {/* Logo y saludo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
          <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
            `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
          } 👋</span></span>
        </div>
        {/* ToggleTabs y Ver Resumen juntos, centrados */}
        <div className="absolute left-[55%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
          <ToggleTabs active={vista} onChange={setVista} />
          <button
            ref={resumenBtnRef}
            onClick={() => setShowResumen(v => !v)}
            className="ml-8 px-4 py-1.5 rounded-full bg-white/80 text-[#297373] font-semibold shadow hover:bg-white transition border border-[#e0d7ce] focus:outline-none"
          >
            Ver Resumen
          </button>
          {/* KPIs originales restaurados */}
          <div className="flex items-center gap-2 ml-4">
            {/* Activos primero */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-semibold mb-1">Activos</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold text-lg">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 16V6m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activos}
                <span className="text-xs text-emerald-500 font-semibold ml-1">
                  {porcentajeActivos}%
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
                {bajas}
                <span className="text-xs text-rose-600 font-semibold ml-1">
                  {porcentajeBajas}%
                </span>
              </span>
            </div>
          </div>
          {/* Botón de tienda de marcos al final del bloque central */}
          <button
            onClick={() => setShowTienda(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 transition ml-6"
            title="Tienda de marcos"
          >
            {/* SVG tienda con toldo y puerta (opción 1) */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M3 7L5 3h14l2 4" stroke="#f59e42" strokeWidth="2" fill="none"/>
              <rect x="2" y="7" width="20" height="4" rx="2" fill="#f59e42" stroke="#f59e42" strokeWidth="2"/>
              <rect x="4" y="11" width="16" height="9" rx="2" fill="#fff" stroke="#f59e42" strokeWidth="2"/>
              <rect x="9" y="15" width="3" height="5" rx="1" fill="#f59e42"/>
            </svg>
          </button>
          {/* Botón de ruleta al lado de tienda */}
          <button
            onClick={() => setShowRuleta(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 transition ml-2"
            title="Ruleta de puntos"
          >
            {/* SVG ruleta/dado */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" stroke="#f59e42" strokeWidth="2" fill="#fff" />
              <circle cx="12" cy="7" r="1.5" fill="#f59e42" />
              <circle cx="7" cy="12" r="1.5" fill="#f59e42" />
              <circle cx="17" cy="12" r="1.5" fill="#f59e42" />
              <circle cx="12" cy="17" r="1.5" fill="#f59e42" />
            </svg>
          </button>
        </div>
        {/* Avatar de usuario en la esquina superior derecha */}
        <div className="ml-auto flex items-center">
          <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
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
                onChange={e => setCampaniaSeleccionada(Number(e.target.value))}
              >
                {[...new Set(capas.map(c => c.CampañaID))].map(id => {
                  const camp = capas.find(c => c.CampañaID === id);
                  return <option key={id} value={id}>{camp?.NombreCampaña || id}</option>;
                })}
              </select>
              {/* Select de capa/fecha */}
              <select
                style={{ backgroundColor: '#dbeafe' }}
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={capaSeleccionada?.capa || ""}
                onChange={e => {
                  const nueva = capas.find(c => c.capa.toString() === e.target.value && c.CampañaID === campaniaSeleccionada);
                  setCapaSeleccionada(nueva);
                }}
              >
                {capas.filter(c => c.CampañaID === campaniaSeleccionada).map(c => (
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
                  compact={false}
                  dniCap={dniCap}
                  CampañaID={capaSeleccionada?.CampañaID}
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
      </div>
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
  );
}