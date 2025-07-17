import React, { useState } from "react";
import { api } from "../utils/api";

export default function CapacitadorForm({ onValidated }) {
  const [dni, setDni] = useState("");
  const [options, setOptions] = useState([]);
  const [capacitador, setCapacitador] = useState(null);
  const [campanias, setCampanias] = useState([]);
  const [campania, setCampania] = useState("");
  const [error, setError] = useState("");

  // Cargar lista de capacitadores para el datalist
  React.useEffect(() => {
    api("/api/capacitadores").then(setOptions);
  }, []);

  // Validar capacitador y cargar campañas
  const validar = async () => {
    if (!dni) return;
    try {
      const data = await api(`/api/capacitadores/${dni}`);
      // Suponiendo que data.campañas ahora es un array de objetos { CampañaID, NombreCampaña }
      setCapacitador(data);
      setCampanias(data.campañas || []);
      setCampania(data.campañas[0]?.CampañaID || "");
      setError("");
      onValidated && onValidated(data, data.campañas[0]?.CampañaID || "");
    } catch {
      setCapacitador(null);
      setCampanias([]);
      setCampania("");
      setError("DNI inválido o inactivo");
    }
  };

  // Cuando cambia la campaña seleccionada
  const handleCampaniaChange = e => {
    setCampania(e.target.value);
    if (capacitador) {
      onValidated && onValidated(capacitador, e.target.value);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-3xl">
      <div className="flex items-center gap-2">
        <input
          list="capacitadores"
          value={dni}
          onChange={e => setDni(e.target.value)}
          placeholder="DNI capacitador"
          className="border p-2 w-48"
        />
        <datalist id="capacitadores">
          {options.map(o => (
            <option key={o.dni} value={o.dni}>
              {o.dni} – {o.nombreCompleto}
            </option>
          ))}
        </datalist>
        <button
          onClick={validar}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
        >
          Validar
        </button>
        {error && <span className="text-red-600 ml-2">{error}</span>}
      </div>

      {/* Panel de datos del capacitador y selector de campaña */}
      {capacitador && (
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded border mt-2">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Nombres</label>
            <input value={capacitador.nombres} disabled className="border p-2 bg-gray-200 w-48" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Apellido Paterno</label>
            <input value={capacitador.apellidoPaterno} disabled className="border p-2 bg-gray-200 w-48" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Apellido Materno</label>
            <input value={capacitador.apellidoMaterno} disabled className="border p-2 bg-gray-200 w-48" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Campaña</label>
            <select value={campania} onChange={handleCampaniaChange} className="border p-2 min-w-[10rem]" style={{ backgroundColor: '#dbeafe' }}>
              {campanias.map(c => (
                <option key={c.CampañaID} value={c.CampañaID}>{c.NombreCampaña}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
