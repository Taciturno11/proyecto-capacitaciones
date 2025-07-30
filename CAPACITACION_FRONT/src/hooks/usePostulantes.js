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
  const loadLote = async ({ dniCap, CampañaID, mes, fechaInicio, capaNum, horariosBase }) => {
    if (!dniCap || !CampañaID || !mes || mes === 'undefined' || !fechaInicio || fechaInicio === 'undefined' || !capaNum) {
      console.warn('[usePostulantes] No se carga lote por parámetros inválidos:', { dniCap, CampañaID, mes, fechaInicio, capaNum });
      return;
    }
    const { postulantes, asistencias, duracion } = await api(
      `/api/postulantes?dniCap=${dniCap}&campaniaID=${encodeURIComponent(CampañaID)}`+
      `&mes=${mes}&fechaInicio=${fechaInicio}`
    );

    // Fechas
    let d = [fechaInicio];
    while (d.length < duracion.cap + duracion.ojt) d.push(nextDate(d.at(-1)));
    setDias(d);
    setCapCount(duracion.cap);
    setCapaNum(capaNum);

    // Tabla base
    const tabla = postulantes.map(p => {
      // Si el postulante ya tiene asistencias previas, recórtalas o rellénalas
      let asistencia = Array.isArray(p.asistencia) ? [...p.asistencia] : d.map(() => "");
      if (asistencia.length > d.length) asistencia = asistencia.slice(0, d.length);
      if (asistencia.length < d.length) asistencia = [...asistencia, ...Array(d.length - asistencia.length).fill("")];

      // Inicializar turno y horario según el grupo guardado
      let turno = '';
      let horario = '';
      if (p.NombreGrupo && Array.isArray(horariosBase)) {
        const grupo = horariosBase.find(h => h.label === p.NombreGrupo);
        if (grupo) {
          turno = grupo.turno;
          horario = grupo.label;
        }
      }

      return {
        ...p,
        numero      : p.telefono || "",
        asistencia,
        bloqueada   : false, // para bloqueo tras deserción
        resultadoFinal: p.EstadoPostulante || "",
        CampañaID: p.CampañaID,
        NombreCampaña: p.NombreCampaña,
        ModalidadID: p.ModalidadID,
        NombreModalidad: p.NombreModalidad,
        JornadaID: p.JornadaID,
        NombreJornada: p.NombreJornada,
        turno,
        horario
      };
    });
    // Asistencias previas
    const posDni = Object.fromEntries(tabla.map((p,i)=>[p.dni,i]));
    const posF   = Object.fromEntries(d.map((x,i)=>[x,i]));
    console.log('=== CARGANDO ASISTENCIAS ===');
    console.log('Asistencias recibidas:', asistencias);
    asistencias.forEach(a=>{
      const r=posDni[a.postulante_dni], c=posF[a.fecha];
      if(r!=null&&c!=null) {
        // Convertir "D" de la BD a "Deserción" en el frontend
        const valorFinal = a.estado_asistencia === "D" ? "Deserción" : a.estado_asistencia;
        tabla[r].asistencia[c] = valorFinal;
        console.log(`Asistencia para ${a.postulante_dni} en ${a.fecha}: ${a.estado_asistencia} -> ${valorFinal}`);
      }
    });
    setTablaDatos(tabla);

    // Deserciones
    if (dniCap && CampañaID && mes && capaNum) {
      console.log('Llamando a /api/deserciones con:', { dniCap, CampañaID, mes, capaNum });
      const desPrev = await api(
        `/api/deserciones?dniCap=${dniCap}&campaniaID=${encodeURIComponent(CampañaID)}`+
        `&mes=${mes}&capa=${capaNum}`
      );
      console.log('Deserciones recibidas:', desPrev);
      setDeserciones(desPrev.map(d => ({ ...d, guardado: false })));
    } else {
      setDeserciones([]);
    }

    // Evaluaciones
    const evalPrev = await api(
      `/api/evaluaciones?dniCap=${dniCap}&campaniaID=${encodeURIComponent(CampañaID)}`+
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
      
      // Verificar si estaba en deserción y ahora cambia a asistencia normal
      const estabaEnDesercion = copy[row].asistencia[col] === "Deserción";
      const cambiaAAistenciaNormal = val !== "Deserción" && val !== "---" && val !== "";
      
      copy[row].asistencia[col] = val;
      copy[row].dirty = true; // MARCA DIRTY SOLO EN ASISTENCIAS
      
      // Si cambia de deserción a asistencia normal, actualizar resultadoFinal
      if (estabaEnDesercion && cambiaAAistenciaNormal) {
        copy[row].resultadoFinal = "Capacitacion";
      }
      
      // Bloqueo tras deserción
      if (val === "Deserción") {
        for (let i = col + 1; i < copy[row].asistencia.length; i++) {
          copy[row].asistencia[i] = "---";
        }
        copy[row].bloqueada = true;
      } else {
        if (copy[row].bloqueada) {
          for (let i = 0; i < copy[row].asistencia.length; i++) {
            if (copy[row].asistencia[i] === "---") copy[row].asistencia[i] = "";
          }
          copy[row].bloqueada = false;
        }
      }
      return copy;
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

  // Handler para resultado final (para usar en el componente)
  const setResultadoFinal = (row, val) => {
    setTablaDatos(t => {
      const copy = [...t];
      copy[row] = { ...copy[row], resultadoFinal: val, dirty: true };
      return copy;
    });
    setDirty(true);
  };

  // Guardar solo asistencias y resultadoFinal dirty
  const guardarCambios = async params => {
    const { fechaInicio } = params;
    // Payloads
    const payloadA = [];
    tablaDatos.forEach(p => {
      if (p.dirty) {
        p.asistencia.forEach((est, i) => {
          if (est && est !== "---") {
            // Asegurar que CampañaID nunca sea undefined
            const campaniaID = params.campaniaID || p.CampañaID;
            payloadA.push({
              postulante_dni: p.dni,
              fecha: dias[i],
              etapa: i < capCount ? "Capacitacion" : "OJT",
              estado_asistencia: est === "Deserción" ? "D" : est,
              capa_numero: capaNum,
              CampañaID: campaniaID,
              fecha_inicio: params.fechaInicio
            });
          }
        });
      }
    });
    // Filtrar deserciones que no han sido canceladas por cambios de asistencia
    const desercionesCanceladas = new Set();
    payloadA.forEach(asistencia => {
      if (asistencia.estado_asistencia !== 'D') {
        desercionesCanceladas.add(asistencia.postulante_dni);
      }
    });
    
    const desToSend = deserciones
      .filter(d => d.motivo && d.motivo.trim() !== "")
      .filter(d => !desercionesCanceladas.has(d.postulante_dni)) // Excluir deserciones canceladas
      .map(d => ({
        postulante_dni: d.postulante_dni,
        fecha_desercion: d.fecha_desercion,
        motivo: d.motivo,
        capa_numero: Number(d.capa_numero),
        CampañaID: d.CampañaID || params.campaniaID,
        fecha_inicio: params.fechaInicio
      }));
    const payloadE = evaluaciones
      .filter(e => e.nota != null)
      .map(e => ({ ...e, fechaInicio }));
    // Payload de resultado final solo con dirty
    const payloadEstados = tablaDatos
      .filter(p => p.dirty && p.resultadoFinal)
      .map(p => {
        const CampañaID = params.campaniaID || params.CampañaID || p.CampañaID;
        
        // Si el postulante tenía deserción y ahora tiene asistencia normal, 
        // no enviar el estado "Desertó" porque ya se actualizó en el backend
        const tieneDesercionCancelada = p.asistencia.some(est => est === "Deserción") === false && 
                                      p.asistencia.some(est => est === "A" || est === "F" || est === "J" || est === "T") === true;
        
        if (tieneDesercionCancelada && p.resultadoFinal === "Desertó") {
          // No enviar este estado porque ya se actualizó en el backend
          return null;
        }
        
        if (p.resultadoFinal === 'Desaprobado') {
          return {
            dni: p.dni,
            estado: p.resultadoFinal,
            fechaCese: dias[dias.length - 1],
            CampañaID,
            fecha_inicio: params.fechaInicio
          };
        }
        return {
          dni: p.dni,
          estado: p.resultadoFinal,
          CampañaID,
          fecha_inicio: params.fechaInicio
        };
      })
      .filter(p => p !== null); // Filtrar los null
    // Nuevo payload para turno y horario
    const payloadPostulantes = tablaDatos
      .filter(p => p.dirty)
      .map(p => ({
        dni: p.dni,
        nombreGrupo: armarNombreGrupo(p)
      }));
    console.log('Postulantes a enviar (nombreGrupo):', payloadPostulantes);

    console.log('Estados finales a enviar:', payloadEstados);

    // LOGS DE DEPURACIÓN
    console.log("Params recibidos:", params);
    console.log("CampañaID en params:", params.campaniaID);
    console.log("Asistencias a enviar:", payloadA);
    console.log("Deserciones canceladas:", Array.from(desercionesCanceladas));
    console.log("Deserciones a enviar (con CampañaID):", desToSend);
    console.log("Evaluaciones a enviar:", payloadE);

    if (!payloadA.length && !desToSend.length && !payloadE.length && !payloadEstados.length && !payloadPostulantes.length) {
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
      if (payloadEstados.length) await api("/api/postulantes/estado",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadEstados) });
      if (payloadPostulantes.length) await api("/api/postulantes/horario",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadPostulantes) });

      // Limpiar dirty tras guardar
      setTablaDatos(t => t.map(row => ({ ...row, dirty: false })));
      setDirty(false);
      
      // Recargar datos para reflejar cambios en la vista
      await loadLote({ dniCap: params.dniCap, CampañaID: params.CampañaID, mes: params.mes, fechaInicio: params.fechaInicio, capaNum: params.capaNum, horariosBase: params.horariosBase });
      
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
    setTablaDatos // <-- AGREGADO para exponer el setter
  };
}

// Función para armar el nombre del grupo horario a partir del horario seleccionado
function armarNombreGrupo(p) {
  // Se asume que el select de horario guarda el nombre exacto del grupo (ej: 'Full Time Mañana2 (Desc. Dom)')
  return p.horario || '';
}
