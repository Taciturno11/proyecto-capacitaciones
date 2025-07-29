import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import UserAvatar from './UserAvatar';
import TiendaMarcos from './TiendaMarcos';
import PhotoUploadModal from './PhotoUploadModal';
import ResumenCapacitacionesJefeTable from './ResumenCapacitacionesJefeTable';
Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

export default function DashboardCoordinadora() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campania, setCampania] = useState("");
  const [mes, setMes] = useState("");
  const [campanias, setCampanias] = useState([]);
  const [meses, setMeses] = useState([]);
  const [showTiendaMarcos, setShowTiendaMarcos] = React.useState(false);
  const [marcoActual, setMarcoActual] = React.useState(localStorage.getItem('marco') || 'marco1.png');
  const [marcoPreview, setMarcoPreview] = React.useState(null);
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);
  
  // Estados para filtros de gráficos
  const [filtroGraficosCampania, setFiltroGraficosCampania] = useState("");
  const [filtroGraficosCapa, setFiltroGraficosCapa] = useState("");
  const [capas, setCapas] = useState([]);
  
  const nombres = localStorage.getItem('nombres') || '';
  const apellidoPaterno = localStorage.getItem('apellidoPaterno') || '';
  const apellidoMaterno = localStorage.getItem('apellidoMaterno') || '';
  const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

  useEffect(() => {
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    api(`/api/dashboard-coordinadora/${dni}/campanias`).then(setCampanias);
    api(`/api/dashboard-coordinadora/${dni}/meses`).then(setMeses);
  }, []);

  // Cargar capas cuando cambia la campaña en filtros de gráficos
  useEffect(() => {
    console.log('🔄 useEffect capas ejecutado');
    console.log('  - filtroGraficosCampania:', filtroGraficosCampania);
    console.log('  - tipo de filtroGraficosCampania:', typeof filtroGraficosCampania);
    
    if (!filtroGraficosCampania) {
      console.log('  - No hay campaña seleccionada, limpiando capas');
      setCapas([]);
      setFiltroGraficosCapa("");
      return;
    }
    
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    console.log('  - DNI obtenido:', dni);
    console.log('  - URL a llamar:', `/api/dashboard-coordinadora/${dni}/capas?campania=${encodeURIComponent(filtroGraficosCampania)}`);
    
    api(`/api/dashboard-coordinadora/${dni}/capas?campania=${encodeURIComponent(filtroGraficosCampania)}`)
      .then(data => {
        console.log('✅ Capas cargadas exitosamente:', data);
        setCapas(data);
        setFiltroGraficosCapa("");
      })
      .catch(error => {
        console.error('❌ Error cargando capas:', error);
        setCapas([]);
      });
  }, [filtroGraficosCampania]);

  useEffect(() => {
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    setLoading(true);
    api(`/api/dashboard-coordinadora/${dni}?campania=${campania}&mes=${mes}`).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [campania, mes]);

  // Función para obtener datos filtrados para gráficos
  const obtenerDatosGraficos = async () => {
    if (!filtroGraficosCampania && !filtroGraficosCapa) {
      return data; // Usar datos principales si no hay filtros
    }
    
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    let url = `/api/dashboard-coordinadora/${dni}`;
    const params = [];
    
    if (filtroGraficosCampania) {
      params.push(`campania=${encodeURIComponent(filtroGraficosCampania)}`);
    }
    if (filtroGraficosCapa) {
      params.push(`capa=${encodeURIComponent(filtroGraficosCapa)}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    try {
      const datosFiltrados = await api(url);
      return datosFiltrados;
    } catch (error) {
      console.error('Error obteniendo datos filtrados:', error);
      return data; // Fallback a datos principales
    }
  };

  // Estado para datos de gráficos
  const [datosGraficos, setDatosGraficos] = useState(null);

  // Actualizar datos de gráficos cuando cambian los filtros
  useEffect(() => {
    if (!data) return;
    
    obtenerDatosGraficos().then(datos => {
      setDatosGraficos(datos);
    });
  }, [filtroGraficosCampania, filtroGraficosCapa, data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#297373] to-[#FE7F2D]">
        <span className="text-white text-xl">Cargando dashboard...</span>
      </div>
    );
  }

  const datosParaGraficos = datosGraficos || data;
  const { totales, capacitadores } = datosParaGraficos;
  const kpi = [
    { label: "Capacitadores activos", value: capacitadores.length, color: "bg-blue-100 text-blue-800" },
    { label: "Postulantes totales", value: totales.postulantes, color: "bg-emerald-100 text-emerald-800" },
    { label: "Deserciones", value: totales.deserciones, color: "bg-rose-100 text-rose-800" },
    { label: "Deserciones ATH1", value: `${totales.desercionesATH1} (${totales.porcentajeDesercionesATH1}%)`, color: "bg-orange-100 text-orange-800" },
    { label: "Deserciones ATH2", value: `${totales.desercionesATH2} (${totales.porcentajeDesercionesATH2}%)`, color: "bg-red-100 text-red-800" },
    { label: "Deserciones Formación", value: `${totales.desercionesATHFormacion} (${totales.porcentajeDesercionesATHFormacion}%)`, color: "bg-purple-100 text-purple-800" },
    { label: "% Éxito", value: totales.porcentajeExito + '%', color: "bg-yellow-100 text-yellow-800" },
  ];

  // Datos para gráficos
  const barData = {
    labels: capacitadores.map(c => {
      const partes = c.nombreCompleto.trim().split(/\s+/);
      const nombre = partes[0] || '';
      const apellido = partes[1] || '';
      return `${nombre} ${apellido}`.trim();
    }),
    datasets: [
      {
        label: "Postulantes",
        data: capacitadores.map(c => c.postulantes),
        backgroundColor: "#60a5fa",
      },
      {
        label: "Deserciones ATH1",
        data: capacitadores.map(c => c.desercionesATH1 || 0),
        backgroundColor: "#f97316", // naranja
      },
      {
        label: "Deserciones ATH2",
        data: capacitadores.map(c => c.desercionesATH2 || 0),
        backgroundColor: "#ef4444", // rojo
      },
      {
        label: "Deserciones Formación",
        data: capacitadores.map(c => c.desercionesATHFormacion || 0),
        backgroundColor: "#a855f7", // púrpura
      },
      {
        label: "Contratados",
        data: capacitadores.map(c => c.contratados),
        backgroundColor: "#6ee7b7",
      },
    ],
  };

  const pieData = {
    labels: ["Contratados", "Deserciones ATH1", "Deserciones ATH2", "Deserciones Formación", "Otros"],
    datasets: [
      {
        data: [
          totales.contratados,
          totales.desercionesATH1,
          totales.desercionesATH2,
          totales.desercionesATHFormacion,
          totales.postulantes - totales.contratados - totales.desercionesATH1 - totales.desercionesATH2 - totales.desercionesATHFormacion,
        ],
        backgroundColor: ["#6ee7b7", "#f97316", "#ef4444", "#a855f7", "#fcd34d"],
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f9fd' }}>
      <div className="flex items-center justify-between px-8 py-3 bg-white shadow-md rounded-b-3xl mb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <img src="/partner.svg" alt="logo" className="w-9 h-9 bg-white/30 rounded-full p-1" />
            <span className="font-bold text-[#22314a] text-xl">Panel de Coordinadora</span>
          </div>
          <span className="ml-12 text-base text-[#22314a] font-bold leading-tight flex items-center gap-2">{nombreCompleto} <span className="text-2xl">👋</span></span>
        </div>
        <div className="flex items-center">
          <button onClick={() => setShowTiendaMarcos(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 shadow hover:bg-blue-200 transition mr-14"
            title="Tienda de Marcos"
            aria-label="Tienda de Marcos"
          >
            {/* Icono de tienda, puedes reemplazar por un SVG si tienes uno */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v2.25M3 9.75l1.5 8.25A2.25 2.25 0 006.72 20.25h10.56a2.25 2.25 0 002.22-2.25l1.5-8.25M3 9.75h18" />
              <rect x="6.75" y="13.5" width="3" height="3" rx="0.75" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <rect x="14.25" y="13.5" width="3" height="3" rx="0.75" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
          <UserAvatar onLogout={() => { localStorage.clear(); window.location.reload(); }} marco={marcoPreview || marcoActual} />
        </div>
      </div>
      {showTiendaMarcos && (
        <div className="fixed left-0 right-0 z-50 flex flex-col items-center justify-start pt-8 bg-[#f7f9fd] bg-opacity-98 overflow-auto"
             style={{top: '104px', height: 'calc(100vh - 104px)', width: '100vw'}}>
          <TiendaMarcos
            onClose={() => { setShowTiendaMarcos(false); setMarcoPreview(null); }}
            onSelectMarco={(file) => {
              setMarcoActual(file);
              localStorage.setItem('marco', file);
            }}
          />
          <div className="mt-2 text-xs text-gray-400">* El cambio solo se guarda definitivamente en tu perfil cuando lo selecciones en tu menú de usuario.</div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 px-8 mb-4">
        <select
          className="px-4 py-2 rounded-xl border border-blue-200 bg-white/80 text-blue-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={campania}
          onChange={e => setCampania(e.target.value)}
        >
          <option value="">Todas las campañas</option>
          {campanias.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select
          className="px-4 py-2 rounded-xl border border-blue-200 bg-white/80 text-blue-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={mes}
          onChange={e => setMes(e.target.value)}
        >
          <option value="">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-7 gap-4 px-8 mb-8">
        {kpi.map((k, i) => (
          <div key={i} className={`rounded-2xl p-4 shadow-lg flex flex-col items-center ${k.color}`}>
            <span className="text-2xl font-bold mb-1">{k.value}</span>
            <span className="text-sm font-semibold text-center">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Resumen de Capacitaciones Jefe */}
      <div className="px-8">
        <ResumenCapacitacionesJefeTable />
      </div>

      {/* Tabla de capacitadores */}
      <div className="bg-white/80 rounded-2xl shadow-xl mx-8 p-6 overflow-x-auto">
        <h2 className="text-xl font-bold text-[#297373] mb-4">Capacitadores activos</h2>
        <table className="min-w-full text-sm rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-blue-100 text-blue-900">
              <th className="px-4 py-2 text-left">DNI</th>
              <th className="px-4 py-2 text-left">Nombre completo</th>
              <th className="px-4 py-2 text-center">Postulantes</th>
              <th className="px-4 py-2 text-center">Deserciones</th>
              <th className="px-4 py-2 text-center">Contratados</th>
              <th className="px-4 py-2 text-center">% Éxito</th>
            </tr>
          </thead>
          <tbody>
            {capacitadores.map(c => {
              const tasaDesercion = c.postulantes > 0 ? Math.round((c.deserciones / c.postulantes) * 100) : 0;
              const alertaRoja = tasaDesercion > 40;
              return (
                <tr key={c.dni} className={`border-b last:border-b-0 hover:bg-blue-50 transition ${alertaRoja ? 'bg-red-100 text-red-800 font-semibold' : ''}`}>
                  <td className="px-4 py-2 font-mono">{c.dni}</td>
                  <td className="px-4 py-2">{c.nombreCompleto}</td>
                  <td className="px-4 py-2 text-center">{c.postulantes}</td>
                  <td className="px-4 py-2 text-center flex items-center justify-center gap-1">
                    {c.deserciones}
                    <span className="text-xs text-gray-600">({tasaDesercion}%)</span>
                    {alertaRoja && (
                      <span title="¡Alerta! Tasa de deserción mayor a 40%">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-600 inline" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">{c.contratados}</td>
                  <td className="px-4 py-2 text-center">{c.porcentajeExito}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-8 mt-10 mb-8">
        {/* Filtros para gráficos */}
        <div className="md:col-span-2 bg-white/80 rounded-2xl shadow-xl p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-lg font-bold text-[#297373]">Filtros para gráficos:</span>
            <select
              className="px-4 py-2 rounded-xl border border-blue-200 bg-white/80 text-blue-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              value={filtroGraficosCampania}
              onChange={e => {
                console.log('Campaña seleccionada:', e.target.value); // Debug log
                setFiltroGraficosCampania(e.target.value);
              }}
            >
              <option value="">Todas las campañas</option>
              {campanias.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 rounded-xl border border-blue-200 bg-white/80 text-blue-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              value={filtroGraficosCapa}
              onChange={e => setFiltroGraficosCapa(e.target.value)}
              disabled={!filtroGraficosCampania}
            >
              <option value="">Todas las capas</option>
              {(() => {
                console.log('🎯 Renderizando capas:', capas.length, 'opciones');
                return capas.map(c => (
                  <option key={c.capa} value={c.capa}>
                    Capa {c.capa} — {c.fechaInicio}
                  </option>
                ));
              })()}
            </select>
            <button
              onClick={() => {
                setFiltroGraficosCampania("");
                setFiltroGraficosCapa("");
              }}
              className="px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition shadow-md"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[320px]">
          <span className="text-lg font-bold text-[#297373] mb-2">Postulantes, Deserciones por Tipo y Contratados por Capacitador</span>
          <div className="w-full flex justify-center">
            <div style={{ maxWidth: 500, maxHeight: 350, width: '100%' }}>
              <Bar 
                data={barData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return context.dataset.label + ': ' + context.parsed.y;
                        }
                      }
                    },
                    datalabels: {
                      anchor: 'end',
                      align: 'top',
                      offset: 4,
                      color: '#333',
                      font: {
                        weight: 'bold',
                        size: 11
                      },
                      formatter: function(value) {
                        return value > 0 ? value : '';
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 5,
                        callback: function(value) {
                          return value;
                        }
                      }
                    }
                  }
                }} 
                height={350} 
              />
            </div>
          </div>
        </div>
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[320px]">
          <span className="text-lg font-bold text-[#297373] mb-2">Distribución de Estados Finales y Deserciones por Tipo</span>
          <div className="flex justify-center w-full">
            <div style={{ maxWidth: 350, maxHeight: 350, width: '100%' }}>
              <Pie 
                data={pieData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { position: 'bottom' },
                    datalabels: {
                      color: '#000000',
                      font: {
                        weight: 'bold',
                        size: 14
                      },
                      formatter: function(value) {
                        return value > 0 ? value : '';
                      },
                      textAlign: 'center',
                      textBaseline: 'middle'
                    }
                  } 
                }} 
                height={350} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 