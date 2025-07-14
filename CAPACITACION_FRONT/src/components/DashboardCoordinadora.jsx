import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Bar, Pie } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function DashboardCoordinadora() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campania, setCampania] = useState("");
  const [mes, setMes] = useState("");
  const [campanias, setCampanias] = useState([]);
  const [meses, setMeses] = useState([]);

  useEffect(() => {
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    api(`/api/dashboard-coordinadora/${dni}/campanias`).then(setCampanias);
    api(`/api/dashboard-coordinadora/${dni}/meses`).then(setMeses);
  }, []);

  useEffect(() => {
    const dni = localStorage.getItem("dni") || JSON.parse(atob(localStorage.getItem("token").split('.')[1])).dni;
    setLoading(true);
    api(`/api/dashboard-coordinadora/${dni}?campania=${campania}&mes=${mes}`).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [campania, mes]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#297373] to-[#FE7F2D]">
        <span className="text-white text-xl">Cargando dashboard...</span>
      </div>
    );
  }

  const { totales, capacitadores } = data;
  const kpi = [
    { label: "Capacitadores activos", value: capacitadores.length, color: "bg-blue-100 text-blue-800" },
    { label: "Postulantes totales", value: totales.postulantes, color: "bg-emerald-100 text-emerald-800" },
    { label: "Deserciones", value: totales.deserciones, color: "bg-rose-100 text-rose-800" },
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
        label: "Deserciones",
        data: capacitadores.map(c => c.deserciones),
        backgroundColor: "#fca5a5",
      },
      {
        label: "Contratados",
        data: capacitadores.map(c => c.contratados),
        backgroundColor: "#6ee7b7",
      },
    ],
  };

  const pieData = {
    labels: ["Contratados", "Desertó", "Otros"],
    datasets: [
      {
        data: [
          totales.contratados,
          totales.deserciones,
          totales.postulantes - totales.contratados - totales.deserciones,
        ],
        backgroundColor: ["#6ee7b7", "#fca5a5", "#fcd34d"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
      <div className="flex items-center justify-between px-8 py-6 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-6">
        <div className="flex items-center gap-3">
          <img src="/partner.svg" alt="logo" className="w-10 h-10 bg-white/30 rounded-full p-1" />
          <span className="font-bold text-white text-2xl drop-shadow">Panel de Coordinadora</span>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-gradient-to-r from-[#297373] to-[#FE7F2D] text-white px-6 py-2 rounded-full font-semibold text-base shadow hover:opacity-90 transition">Cerrar sesión</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 px-8 mb-4">
        <select
          className="px-4 py-2 rounded-xl border border-blue-200 bg-white/80 text-blue-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={campania}
          onChange={e => setCampania(e.target.value)}
        >
          <option value="">Todas las campañas</option>
          {campanias.map(c => <option key={c} value={c}>{c}</option>)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-8 mb-8">
        {kpi.map((k, i) => (
          <div key={i} className={`rounded-2xl p-6 shadow-lg flex flex-col items-center ${k.color}`}>
            <span className="text-3xl font-bold mb-2">{k.value}</span>
            <span className="text-lg font-semibold">{k.label}</span>
          </div>
        ))}
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
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[320px]">
          <span className="text-lg font-bold text-[#297373] mb-2">Postulantes, Deserciones y Contratados por Capacitador</span>
          <div className="w-full flex justify-center">
            <div style={{ maxWidth: 500, maxHeight: 350, width: '100%' }}>
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} height={350} />
            </div>
          </div>
        </div>
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[320px]">
          <span className="text-lg font-bold text-[#297373] mb-2">Distribución de Estados Finales</span>
          <div className="flex justify-center w-full">
            <div style={{ maxWidth: 350, maxHeight: 350, width: '100%' }}>
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} height={350} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 