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
    console.log('[loadLote] RECIBIDO parámetros:', { dniCap, CampañaID, mes, fechaInicio, capaNum, horariosBase });
    
    if (!dniCap || !CampañaID || !mes || mes === 'undefined' || !fechaInicio || fechaInicio === 'undefined' || !capaNum) {
      console.warn('[usePostulantes] No se carga lote por parámetros inválidos:', { dniCap, CampañaID, mes, fechaInicio, capaNum });
      return;
    }
    
    console.log('[usePostulantes] Iniciando loadLote con parámetros:', { dniCap, CampañaID, mes, fechaInicio, capaNum, horariosBase });
    
    console.log('[loadLote] Llamando a API /api/postulantes con:', { dniCap, campaniaID: CampañaID, mes, fechaInicio });
    
    const { postulantes, asistencias, duracion } = await api(
      `/api/postulantes?dniCap=${dniCap}&campaniaID=${encodeURIComponent(CampañaID)}`+
      `&mes=${mes}&fechaInicio=${fechaInicio}`
    );
    
    console.log('[loadLote] Datos recibidos de la API:', { postulantes: postulantes?.length, asistencias: asistencias?.length, duracion });
    console.log('[loadLote] URL completa de la API:', `/api/postulantes?dniCap=${dniCap}&campaniaID=${encodeURIComponent(CampañaID)}&mes=${mes}&fechaInicio=${fechaInicio}`);

    // Fechas
    let d = [fechaInicio];
    while (d.length < duracion.cap + duracion.ojt) d.push(nextDate(d.at(-1)));
    setDias(d);
    setCapCount(duracion.cap);
    setCapaNum(capaNum);

    console.log('[usePostulantes] Fechas calculadas:', d);
    console.log('[usePostulantes] Duración:', duracion);

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
    
    // Crear un mapa de fechas más robusto que soporte diferentes formatos
    const posF = {};
    d.forEach((fecha, i) => {
      // Formato exacto como viene del frontend
      posF[fecha] = i;
      
      // Normalizar formato YYYY-MM-DD sin importar cómo venga
      try {
        const [y, m, day] = fecha.split('-');
        // Formato con ceros explícitos
        posF[`${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`] = i;
        // Formato de objeto Date convertido a string
        const dt = new Date(y, m-1, day);
        posF[dt.toISOString().slice(0,10)] = i;
        
        // Formato alternativo sin guiones (por si acaso)
        posF[`${y}${m.padStart(2, '0')}${day.padStart(2, '0')}`] = i;
        
        // Formato con barras (por si acaso)
        posF[`${y}/${m.padStart(2, '0')}/${day.padStart(2, '0')}`] = i;
        
        // Formato DD/MM/YYYY (por si acaso)
        posF[`${day.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`] = i;
        
      } catch (e) {
        console.error("Error normalizando fecha:", fecha, e);
      }
    });
    
    // VALIDACIÓN ADICIONAL: Verificar que todas las fechas tengan al menos un formato
    console.log('[loadLote] Mapa de fechas creado con', Object.keys(posF).length, 'formatos diferentes');
    
    console.log("Mapa de posiciones de fechas:", posF);
    console.log('=== CARGANDO ASISTENCIAS ===');
    console.log('Asistencias recibidas:', asistencias);
    console.log("Fechas calculadas del frontend:", d);
    const fechasAPI = asistencias.map(a => a.fecha);
    console.log("Fechas recibidas de la API:", fechasAPI);
    
    // Log detallado de cada asistencia
    console.log('=== ANÁLISIS DETALLADO DE ASISTENCIAS ===');
    asistencias.forEach((a, index) => {
      console.log(`Asistencia ${index + 1}:`, {
        postulante_dni: a.postulante_dni,
        fecha: a.fecha,
        estado: a.estado_asistencia,
        posDni: posDni[a.postulante_dni],
        posF: posF[a.fecha],
        fechaEnMapa: posF[a.fecha] !== undefined ? 'SÍ' : 'NO'
      });
    });
    
    // Verificar coincidencias
    const coincidencias = [];
    const sinCoincidencia = [];
    
    asistencias.forEach(a => {
      const r = posDni[a.postulante_dni];
      const c = posF[a.fecha];
      
      if (r != null && c != null) {
        // Convertir "D" de la BD a "Deserción" en el frontend
        const valorFinal = a.estado_asistencia === "D" ? "Deserción" : a.estado_asistencia;
        tabla[r].asistencia[c] = valorFinal;
        console.log(`✅ Asistencia para ${a.postulante_dni} en ${a.fecha} (posición ${c}): ${a.estado_asistencia} -> ${valorFinal}`);
        coincidencias.push(a.fecha);
      } else {
        console.log(`❌ FALLO: Asistencia no asignada para ${a.postulante_dni} en fecha ${a.fecha} - r=${r}, c=${c}`);
        sinCoincidencia.push(a.fecha);
      }
    });
    
    console.log(`🔍 Resumen: ${coincidencias.length} fechas con coincidencias, ${sinCoincidencia.length} sin coincidencia`);
    
    // SISTEMA DE RECUPERACIÓN AUTOMÁTICA
    if (sinCoincidencia.length > 0) {
      console.log("⚠️ ALERTA: Fechas sin coincidencia detectadas:", sinCoincidencia);
      console.log("🔧 Intentando recuperación automática...");
      
      // Verificar si hay asistencias en la BD que no se están mostrando
      const fechasConAsistencias = asistencias.map(a => a.fecha);
      const fechasSinMostrar = sinCoincidencia.filter(fecha => fechasConAsistencias.includes(fecha));
      
      if (fechasSinMostrar.length > 0) {
        console.log("🚨 CRÍTICO: Hay asistencias en la BD que no se están mostrando:", fechasSinMostrar);
        console.log("💡 Recomendación: Verificar formato de fechas en la BD o en el frontend");
      }
    }
    
    // VALIDACIÓN FINAL: Verificar que todas las fechas calculadas tengan datos
    const fechasSinDatos = d.map((fecha, i) => {
      const tieneDatos = tabla.some(row => row.asistencia[i] && row.asistencia[i] !== "");
      return { fecha, indice: i, tieneDatos };
    });
    
    const fechasVacias = fechasSinDatos.filter(f => !f.tieneDatos);
    if (fechasVacias.length > 0) {
      console.log("⚠️ ADVERTENCIA: Fechas calculadas sin datos de asistencia:", fechasVacias);
    }
    
    console.log('[loadLote] Estado final de tabla:', tabla.map(row => ({
      dni: row.dni,
      asistencia: row.asistencia.slice(0, 5) // Solo las primeras 5 asistencias para no saturar el log
    })));
    
    // NUEVA FUNCIONALIDAD: Aplicar ordenamiento automático (activos primero, deserciones al final)
    const tablaOrdenada = ordenarTablaConDesercionesAlFinal(tabla, d);
    
    console.log('[loadLote] Llamando a setTablaDatos con', tablaOrdenada.length, 'filas (ordenadas)');
    
    // SISTEMA DE MONITOREO DE INTEGRIDAD
    const integridadDatos = {
      totalPostulantes: tabla.length,
      totalFechas: d.length,
      asistenciasCargadas: coincidencias.length,
      asistenciasPerdidas: sinCoincidencia.length,
      porcentajeExito: Math.round((coincidencias.length / (coincidencias.length + sinCoincidencia.length)) * 100) || 0
    };
    
    console.log('📊 REPORTE DE INTEGRIDAD:', integridadDatos);
    
    // ALERTA SI LA INTEGRIDAD ES BAJA
    if (integridadDatos.porcentajeExito < 95) {
      console.warn('🚨 ALERTA: Baja integridad de datos detectada:', integridadDatos.porcentajeExito + '%');
      console.warn('💡 Recomendación: Verificar conexión a BD y formato de fechas');
    }
    
    setTablaDatos(tablaOrdenada);

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
    
    console.log('[usePostulantes] loadLote completado exitosamente');
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
    console.log('[guardarCambios] INICIANDO con parámetros:', params);
    const { fechaInicio } = params;
    // Payloads
    const payloadA = [];
    tablaDatos.forEach(p => {
      if (p.dirty) {
        p.asistencia.forEach((est, i) => {
          if (est && est !== "---") {
            // Asegurar que CampañaID nunca sea undefined
            const campaniaID = params.CampañaID || p.CampañaID;
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
        CampañaID: d.CampañaID || params.CampañaID,
        fecha_inicio: params.fechaInicio
      }));
    const payloadE = evaluaciones
      .filter(e => e.nota != null)
      .map(e => ({ ...e, fechaInicio }));
    // Payload de resultado final solo con dirty
    const payloadEstados = tablaDatos
      .filter(p => p.dirty && p.resultadoFinal)
      .map(p => {
        const CampañaID = params.CampañaID || p.CampañaID;
        
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

      console.log('[guardarCambios] Todas las APIs completadas exitosamente');

      // Limpiar dirty tras guardar
      setTablaDatos(t => t.map(row => ({ ...row, dirty: false })));
      setDirty(false);
      
      // Recargar datos para reflejar cambios en la vista
      console.log('[guardarCambios] Recargando datos con parámetros:', { dniCap: params.dniCap, CampañaID: params.CampañaID, mes: params.mes, fechaInicio: params.fechaInicio, capaNum: params.capaNum, horariosBase: params.horariosBase });
      
      try {
        console.log('[guardarCambios] Llamando a loadLote...');
        await loadLote({ dniCap: params.dniCap, CampañaID: params.CampañaID, mes: params.mes, fechaInicio: params.fechaInicio, capaNum: params.capaNum, horariosBase: params.horariosBase });
        console.log('[guardarCambios] loadLote completado exitosamente');
      } catch (error) {
        console.error('[guardarCambios] Error al recargar datos:', error);
      }
      
      console.log('[guardarCambios] Recarga completada, mostrando alerta de éxito');
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
    refreshOJT, downloadExcel, setResultadoFinal,
    setTablaDatos // <-- AGREGADO para exponer el setter
  };
}

// Función para armar el nombre del grupo horario a partir del horario seleccionado
function armarNombreGrupo(p) {
  // Se asume que el select de horario guarda el nombre exacto del grupo (ej: 'Full Time Mañana2 (Desc. Dom)')
  return p.horario || '';
}

// NUEVA FUNCIÓN: Ordenar tabla con deserciones al final
function ordenarTablaConDesercionesAlFinal(tabla, dias) {
  // Separar activos y deserciones
  const activos = tabla.filter(p => {
    const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
    return idxDesercion === -1; // No tiene deserción
  });

  const deserciones = tabla.filter(p => {
    const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
    return idxDesercion !== -1; // Tiene deserción
  });

  // Ordenar deserciones por fecha de deserción (más recientes al final)
  const desercionesOrdenadas = deserciones.sort((a, b) => {
    const fechaA = a.asistencia.findIndex(est => est === "Deserción");
    const fechaB = b.asistencia.findIndex(est => est === "Deserción");
    
    // Si ambas tienen deserción, ordenar por fecha de deserción
    if (fechaA !== -1 && fechaB !== -1) {
      const fechaDesercionA = dias[fechaA];
      const fechaDesercionB = dias[fechaB];
      return new Date(fechaDesercionA) - new Date(fechaDesercionB);
    }
    
    return 0;
  });

  // Combinar: activos primero, deserciones al final
  return [...activos, ...desercionesOrdenadas];
}
