import { useState, useEffect } from "react";
import { api } from "../utils/api";

function getMostRecentCapa(capas) {
  if (!capas.length) return null;
  return capas.reduce((a, b) => (a.fechaInicio > b.fechaInicio ? a : b));
}

function isValidLoteParams({ mes, fechaInicio }) {
  return mes && mes !== "undefined" && fechaInicio && fechaInicio !== "undefined";
}

export default function SelectorBar({ capInfo, campania, onLoteCargado }) {
  const [meses, setMeses] = useState([]);
  const [mes, setMes] = useState("");
  const [capas, setCapas] = useState([]);
  const [capa, setCapa] = useState("");
  const [capaObj, setCapaObj] = useState(null);

  // Cargar meses cuando hay capacitador y campaña
  useEffect(() => {
    if (!capInfo || !campania) return;
    api(`/api/meses`)
      .then(meses => {
        setMeses(meses);
        if (meses.length === 1) {
          setMes(meses[0]);
        } else if (!meses.includes(mes)) {
          setMes("");
        }
      });
    setCapas([]);
    setCapa("");
    setCapaObj(null);
    // eslint-disable-next-line
  }, [capInfo, campania]);

  // Cargar capas cuando cambia el mes
  useEffect(() => {
    if (!mes) { setCapas([]); setCapa(""); setCapaObj(null); return; }
    api(`/api/capas?campania=${encodeURIComponent(campania)}&mes=${mes}`)
      .then(data => {
        const filtered = data.filter(c => c.fechaInicio.slice(0, 7) === mes);
        setCapas(filtered);
        if (filtered.length === 1) {
          setCapa(filtered[0].capa.toString());
          setCapaObj(filtered[0]);
          // Solo llama si los datos son válidos
          const params = {
            dniCap: capInfo.dni,
            campania,
            mes,
            fechaInicio: filtered[0].fechaInicio,
            capaNum: filtered[0].capa
          };
          if (isValidLoteParams(params)) {
            console.log("[SelectorBar] Cargando automáticamente única capa:", params);
            onLoteCargado && onLoteCargado(params);
          } else {
            console.warn("[SelectorBar] No se carga lote por datos inválidos:", params);
          }
        } else if (filtered.length > 1) {
          const mostRecent = getMostRecentCapa(filtered);
          setCapa(mostRecent.capa.toString());
          setCapaObj(mostRecent);
          const params = {
            dniCap: capInfo.dni,
            campania,
            mes,
            fechaInicio: mostRecent.fechaInicio,
            capaNum: mostRecent.capa
          };
          if (isValidLoteParams(params)) {
            console.log("[SelectorBar] Cargando automáticamente capa más reciente:", params);
            onLoteCargado && onLoteCargado(params);
          } else {
            console.warn("[SelectorBar] No se carga lote por datos inválidos:", params);
          }
        } else {
          setCapa("");
          setCapaObj(null);
        }
      });
    // eslint-disable-next-line
  }, [mes, campania]);

  // Cuando cambia la capa seleccionada manualmente
  useEffect(() => {
    if (!capa || !capas.length) return;
    const obj = capas.find(c => c.capa.toString() === capa);
    setCapaObj(obj);
    if (obj && obj.fechaInicio.slice(0, 7) !== mes) {
      setMes(obj.fechaInicio.slice(0, 7));
    }
    if (obj) {
      const params = {
        dniCap: capInfo.dni,
        campania,
        mes: obj.fechaInicio.slice(0, 7),
        fechaInicio: obj.fechaInicio,
        capaNum: obj.capa
      };
      if (isValidLoteParams(params)) {
        console.log("[SelectorBar] Cargando por cambio manual de capa:", params);
        onLoteCargado && onLoteCargado(params);
      } else {
        console.warn("[SelectorBar] No se carga lote por datos inválidos:", params);
      }
    }
  }, [capa]);

  if (!capInfo || !campania) return null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <select value={mes} onChange={e => setMes(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 min-w-[8rem] shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900"
              style={{ backgroundColor: '#e6f4ea' }}>
        <option value="">Mes</option>
        {meses.map(m => (
          <option key={m} value={m}>
            {Intl.DateTimeFormat("es", { month:"long", year:"numeric" })
                 .format(new Date(m + "-01"))}
          </option>
        ))}
      </select>

      {capas.length > 0 && (
        <select value={capa} onChange={e => setCapa(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 min-w-[8rem] shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900"
                style={{ backgroundColor: '#e6f4ea' }}>
          <option value="">Selecciona capa</option>
          {capas.map(c => (
            <option key={c.capa} value={c.capa}>
              Capa {c.capa} — {c.fechaInicio}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
