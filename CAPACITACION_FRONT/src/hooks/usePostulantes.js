/* Hook maestro que concentra toda la lógica original
   de postulantes.js, adaptada a React state. */
import { useState } from "react";
import { api }      from "../utils/api";
import { descargarExcel } from "../utils/excel";

export default function usePostulantes() {
  // Estado global
  const [dias,        setDias]        = useState([]);
  const [capCount,    setCapCount]    = useState(5);
  const [tablaDatos,  setTablaDatos]  = useState([]);
  const [evaluaciones,setEvaluaciones]= useState([]);
  const [deserciones, setDeserciones] = useState([]);
  const [dirty,       setDirty]       = useState(false);
  const [capaNum, setCapaNum] = useState(1);

  // Helpers reutilizados
  const nextDate = iso => {
    const [y,m,d] = iso.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    do { dt.setDate(dt.getDate()+1); } while (dt.getDay()===0);
    return dt.toISOString().slice(0,10);
  };
  const refreshOJT = () => {
    setDias(d => {
      const copy = [...d];
      for (let i=capCount; i<copy.length; i++) copy[i] = nextDate(copy[i-1]);
      return copy;
    });
  };

  // Cargar lote completo (postulantes, asistencias, deserciones, evaluaciones)
  const loadLote = async ({ dniCap, campania, mes, fechaInicio, capaNum }) => {
    if (!dniCap || !campania || !mes || mes === 'undefined' || !fechaInicio || fechaInicio === 'undefined' || !capaNum) {
      console.warn('[usePostulantes] No se carga lote por parámetros inválidos:', { dniCap, campania, mes, fechaInicio, capaNum });
      return;
    }
    const { postulantes, asistencias, duracion } = await api(
      `/api/postulantes?dniCap=${dniCap}&campania=${encodeURIComponent(campania)}`+
      `&mes=${mes}&fechaInicio=${fechaInicio}`
    );

    // Fechas
    let d = [fechaInicio];
    while (d.length < duracion.cap + duracion.ojt) d.push(nextDate(d.at(-1)));
    setDias(d);
    setCapCount(duracion.cap);
    setCapaNum(capaNum);

    // Tabla base
    const tabla = postulantes.map(p => ({
      ...p,
      numero      : p.telefono || "",
      asistencia  : d.map(() => ""),
      bloqueada   : false // para bloqueo tras deserción
    }));
    // Asistencias previas
    const posDni = Object.fromEntries(tabla.map((p,i)=>[p.dni,i]));
    const posF   = Object.fromEntries(d.map((x,i)=>[x,i]));
    asistencias.forEach(a=>{
      const r=posDni[a.postulante_dni], c=posF[a.fecha];
      if(r!=null&&c!=null) {
        // Convertir "D" de la BD a "Deserción" en el frontend
        tabla[r].asistencia[c] = a.estado_asistencia === "D" ? "Deserción" : a.estado_asistencia;
      }
    });
    setTablaDatos(tabla);

    // Deserciones
    const desPrev = await api(
      `/api/deserciones?dniCap=${dniCap}&campania=${encodeURIComponent(campania)}`+
      `&mes=${mes}&capa=${capaNum}`
    );
    setDeserciones(desPrev.map(d => ({ ...d, guardado: false })));

    // Evaluaciones
    const evalPrev = await api(
      `/api/evaluaciones?dniCap=${dniCap}&campania=${encodeURIComponent(campania)}`+
      `&mes=${mes}&fechaInicio=${fechaInicio}`
    );
    setEvaluaciones(evalPrev);
    setDirty(false);
  };

  // Actualizar asistencia y bloquear fila tras deserción
  const setAsistencia = (row, col, val) => {
    setTablaDatos(t => {
      const copy = [...t];
      copy[row] = { ...copy[row] };
      copy[row].asistencia = [...copy[row].asistencia];
      copy[row].asistencia[col] = val;
      
      // Bloqueo tras deserción
      if (val === "Deserción") {
        // Bloquear todas las fechas posteriores
        for (let i = col + 1; i < copy[row].asistencia.length; i++) {
          copy[row].asistencia[i] = "---";
        }
        copy[row].bloqueada = true;
      } else {
        // Si se quita la deserción, desbloquear
        if (copy[row].bloqueada) {
          for (let i = 0; i < copy[row].asistencia.length; i++) {
            if (copy[row].asistencia[i] === "---") copy[row].asistencia[i] = "";
          }
          copy[row].bloqueada = false;
        }
      }
      return copy;
    });

    setDeserciones(d => {
      const p = tablaDatos[row];
      const dni = p.dni;
      const nombre = p.nombre;
      const numero = p.numero;
      const fecha_desercion = dias[col];
      const capa_numero = capaNum; // O usa el valor correcto del contexto
      if (val === "Deserción") {
        // Si no existe ya, agregar
        if (!d.some(x => x.postulante_dni === dni)) {
          return [
            ...d,
            {
              postulante_dni: dni,
              nombre,
              numero,
              fecha_desercion,
              motivo: "",
              capa_numero,
              guardado: false
            }
          ];
        }
        return d;
      } else {
        // Si existe y se quitó la deserción, eliminar
        return d.filter(x => x.postulante_dni !== dni);
      }
    });
    setDirty(true);
  };

  // Actualizar nota
  const setNota = (dni, fecha, nota) => {
    setEvaluaciones(e => {
      const idx = e.findIndex(x => x.postulante_dni === dni && x.fecha_evaluacion === fecha);
      if (nota === "" || nota == null) {
        if (idx > -1) { const c = [...e]; c.splice(idx, 1); return c; }
        return e;
      }
      if (idx > -1) { const c = [...e]; c[idx] = { ...c[idx], nota }; return c; }
      return [...e, { postulante_dni: dni, fecha_evaluacion: fecha, nota }];
    });
    setDirty(true);
  };

  // Actualizar motivo de deserción
  const setDesMotivo = (dni, motivo) => {
    setDeserciones(d => {
      const idx = d.findIndex(x => x.postulante_dni === dni);
      if (idx > -1) { const c = [...d]; c[idx] = { ...c[idx], motivo }; return c; }
      return d;
    });
    setDirty(true);
  };

  // Guardar todo (asistencia+deserciones+evaluaciones)
  const guardarCambios = async params => {
    const { fechaInicio } = params;
    // Payloads
    const payloadA = [];
    tablaDatos.forEach(p => {
      p.asistencia.forEach((est, i) => {
        if (est && est !== "---") {
          payloadA.push({
            postulante_dni: p.dni,
            fecha: dias[i],
            etapa: i < capCount ? "Capacitacion" : "OJT",
            estado_asistencia: est === "Deserción" ? "D" : est
          });
        }
      });
    });
    const desToSend = deserciones
      .filter(d => d.motivo && d.motivo.trim() !== "")
      .map(d => ({
        postulante_dni: d.postulante_dni,
        fecha_desercion: d.fecha_desercion,
        motivo: d.motivo,
        capa_numero: Number(d.capa_numero)
      }));

    const payloadE = evaluaciones
      .filter(e => e.nota != null)
      .map(e => ({ ...e, fechaInicio }));

    // LOGS DE DEPURACIÓN
    console.log("Asistencias a enviar:", payloadA);
    console.log("Deserciones a enviar:", desToSend);
    console.log("Evaluaciones a enviar:", payloadE);

    if (!payloadA.length && !desToSend.length && !payloadE.length) {
      alert("Nada por guardar");
      return;
    }

    try {
      if (payloadA.length) await api("/api/asistencia/bulk",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadA) });
      if (desToSend.length) await api("/api/deserciones/bulk",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(desToSend) });
      if (payloadE.length) await api("/api/evaluaciones/bulk",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadE) });

      setDirty(false);
      alert("Cambios guardados ✔️");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios");
    }
  };

  // Descarga Excel
  const downloadExcel = () => descargarExcel({ tablaDatos, dias, capCount });

  return {
    dias, capCount, tablaDatos, evaluaciones, deserciones, dirty,
    loadLote, setAsistencia, setNota, setDesMotivo, guardarCambios,
    refreshOJT, downloadExcel,
  };
}
