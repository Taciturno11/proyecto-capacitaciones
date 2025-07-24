import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

function PopoverPortal({ anchorRef, children, open }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const popoverRef = useRef(null);

  // Calcular posición cuando se abre
  React.useLayoutEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 4, // 4px de margen
        left: rect.left + window.scrollX + rect.width / 2,
        width: rect.width
      });
    }
  }, [open, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        zIndex: 9999,
        minWidth: 260,
        maxWidth: 320
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function AsistenciasTable({ postCtx, compact, dniCap, CampañaID, mes, fechaInicio, capaNum, horariosBase }) {
  const { dias, tablaDatos, setAsistencia, capCount, loadLote } = postCtx;
  const [popover, setPopover] = useState({ open: false, row: null, col: null });
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const popoverAnchorRefs = useRef({}); // {row_col: ref}
  if (!tablaDatos.length) return null;

  // Mapeo de Jornada para coincidir con los nombres de grupo
  const jornadaMap = {
    'FullTime': 'Full Time',
    'PartTime': 'Part Time',
    'SemiFull': 'Semi Full'
  };

  // Ahora la función está dentro del componente y accede a la prop
  function getHorariosFiltrados(modalidad, jornada, turno) {
    const jornadaGrupo = jornadaMap[jornada] || jornada;
    return (horariosBase || [])
      .filter(h => h.jornada === jornadaGrupo && h.turno === turno && h.descanso === 'Dom');
  }

  const estados = ["", "A", "J", "T", "F", "Deserción"];
  const manyColumns = dias.length > 15;
  const thBase = manyColumns ? "px-1 py-1 min-w-0 text-xs" : compact ? "px-2 py-1 min-w-0" : "px-4 py-2";
  const tdBase = manyColumns ? "border px-1 py-1 min-w-0 text-xs" : compact ? "border px-2 py-1 min-w-0" : "border px-4 py-2";
  const selectBase = manyColumns ? "w-full h-full px-0.5 py-0.5 min-w-0 focus:outline-none bg-transparent text-xs" : compact ? "w-full h-full px-1 py-0.5 min-w-0 focus:outline-none bg-transparent text-xs" : "w-full h-full px-1 focus:outline-none bg-transparent";

  // Guardar motivo y deserción directamente en la base de datos
  const handleGuardarMotivo = async () => {
    if (popover.row !== null && popover.col !== null) {
      setGuardando(true);
      const p = tablaDatos[popover.row];
      const token = localStorage.getItem('token');
      // 1. Guardar asistencia como 'D'
      const asistenciaPayload = [{
        postulante_dni: p.dni,
        fecha: dias[popover.col],
        etapa: popover.col < capCount ? "Capacitacion" : "OJT",
        estado_asistencia: "D",
        capa_numero: p.capa_numero || capaNum || 1
      }];
      try {
        await fetch("/api/asistencia/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify(asistenciaPayload)
        });
        // 2. Guardar deserción
        const desercionPayload = [{
          postulante_dni: p.dni,
          nombre: p.nombre,
          numero: p.numero,
          fecha_desercion: dias[popover.col],
          motivo,
          capa_numero: p.capa_numero || capaNum || 1,
          CampañaID: p.CampañaID, // <-- debe ser el ID numérico
          fecha_inicio: fechaInicio, // <--- AGREGADO
          guardado: false
        }];
        await fetch("/api/deserciones/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify(desercionPayload)
        });
        // Refrescar el lote de datos para que la deserción aparezca inmediatamente
        if (typeof loadLote === 'function') {
          loadLote({
            dniCap,
            CampañaID,
            mes,
            fechaInicio,
            capaNum
          });
        }
      } catch {
        alert("Error al guardar la deserción");
      }
      setPopover({ open: false, row: null, col: null });
      setMotivo("");
      setGuardando(false);
    }
  };
  const handleCancelarMotivo = () => {
    // Revertir la selección de Deserción
    if (popover.row !== null && popover.col !== null) {
      setAsistencia(popover.row, popover.col, "");
    }
    setPopover({ open: false, row: null, col: null });
    setMotivo("");
  };

  return (
    <div className="rounded-xl w-full p-2 bg-transparent shadow-md relative">
      <div className="w-full overflow-x-auto">
        <table
          className="w-full text-sm rounded-xl overflow-hidden bg-white/80"
          style={{ tableLayout: 'fixed' }}
        >
        <thead>
          <tr>
            {/* Nombre y DNI con fondo beige claro y texto centrado */}
            <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-0 rounded-tl-xl`}>Nombre</th>
            <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-0`}>DNI</th>
            <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-0`}>Horario</th>
            {/* Quitar columnas Campaña, Modalidad y Jornada */}
            {/* <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[120px]`}>Campaña</th> */}
            {/* <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[120px]`}>Modalidad</th> */}
            {/* <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[120px]`}>Jornada</th> */}
            {/* Capacitación y OJT */}
            <th colSpan={capCount}
                className={`${thBase} bg-[#ffe5b4] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce]`}>
              – Capacitación +
            </th>
            {dias.length > capCount && (
              <th colSpan={dias.length - capCount}
                  className={`${thBase} bg-[#c8ecd9] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] rounded-tr-xl`}>
                – OJT +
              </th>
            )}
            <th rowSpan={2} className={`${thBase} bg-[#a6d4f2] text-[#1e3a5c] text-center font-semibold border-b border-[#e0d7ce] min-w-0`}>Resultado Final</th>
          </tr>
          <tr>
            {/* Días de capacitación con fondo amarillo, OJT con verde */}
            {dias.map((f, i) => (
              <th
                key={f}
                className={
                  `${compact ? "px-2 py-1 min-w-[105px]" : "px-2 py-1 min-w-[105px]"} text-[#3d3d3d] border-b border-[#e0d7ce] text-center ` +
                  (i < capCount ? "bg-[#ffe5b4]" : "bg-[#c8ecd9]")
                }
              >
                Día {i + 1}<br />{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tablaDatos.map((p, r) => {
            // DEBUG: log longitudes
            if (r === 0) {
              console.log('dias.length:', dias.length, 'p.asistencia.length:', p.asistencia?.length, 'dias:', dias, 'asistencia:', p.asistencia);
            }
            const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
            const tieneDesercion = idxDesercion !== -1;
            // Resaltar fila dirty
            const dirtyClass = p.dirty ? 'ring-2 ring-yellow-400' : '';
            return (
              <tr key={p.dni}
                className={
                  (tieneDesercion
                    ? "bg-red-100"
                    : "bg-[#f9f6f2]/80") + ' ' + dirtyClass
                }
              >
                <td className={`${tdBase} text-left min-w-0 truncate`} title={p.nombre}>{p.nombre}</td>
                <td className={`${tdBase} text-center min-w-0`}>{p.dni}</td>
                <td className={`${tdBase} text-center min-w-0`}>
                  <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                    {/* Select de Turno */}
                    <select
                      value={p.turno || ''}
                      onChange={e => {
                        const turno = e.target.value;
                        postCtx.setTablaDatos(t => {
                          const copy = [...t];
                          copy[r] = { ...copy[r], turno, horario: '' };
                          copy[r].dirty = true;
                          return copy;
                        });
                      }}
                      className="bg-white/80 border border-gray-300 rounded-lg shadow-sm px-0.5 py-0 text-[11px] h-6 min-w-[22px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition outline-none text-center"
                    >
                      <option value="">T</option>
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                    </select>
                    {/* Select de Horario filtrado */}
                    <select
                      value={p.horario || ''}
                      onChange={e => {
                        const horario = e.target.value;
                        postCtx.setTablaDatos(t => {
                          const copy = [...t];
                          copy[r] = { ...copy[r], horario };
                          copy[r].dirty = true;
                          return copy;
                        });
                      }}
                      className="bg-white/80 border border-gray-300 rounded-lg shadow-sm px-0.5 py-0 text-[11px] h-6 min-w-[22px] focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition outline-none text-center"
                    >
                      <option value="">H</option>
                      {getHorariosFiltrados(p.NombreModalidad, p.NombreJornada, p.turno).map(h => (
                        <option key={h.label} value={h.label}>
                          {h.rango}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                {/* <td className={`${tdBase} text-center min-w-[120px]`}>{p.NombreCampaña}</td> */}
                {/* <td className={`${tdBase} text-center min-w-[120px]`}>{p.NombreModalidad}</td> */}
                {/* <td className={`${tdBase} text-center min-w-[120px]`}>{p.NombreJornada}</td> */}
                {dias.map((_, c) => {
                  const valor = (p.asistencia && p.asistencia.length > c) ? p.asistencia[c] : "";
                  if (valor === "---") {
                    return (
                      <td key={c} className={`border p-0 text-center align-middle min-w-0 text-gray-400 bg-[#f9f6f2]/80`}>
                        <span className="select-none">---</span>
                      </td>
                    );
                  }
                  // Deshabilitar todos los días excepto el de la deserción
                  const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
                  const tieneDesercion = idxDesercion !== -1;
                  const disabled = tieneDesercion && c !== idxDesercion;
                  // Fondo gris más oscuro si tiene deserción
                  const darkBg = tieneDesercion ? "bg-gray-400 text-[#3d3d3d]" : "bg-[#f9f6f2]/80";
                  const cellKey = `${r}_${c}`;
                  if (!popoverAnchorRefs.current[cellKey]) {
                    popoverAnchorRefs.current[cellKey] = React.createRef();
                  }
                  return (
                    <td key={c} className={`${tdBase} min-w-0 ${darkBg}`} style={{ position: 'relative' }}>
                      <select
                        ref={popoverAnchorRefs.current[cellKey]}
                        value={valor}
                        onChange={e => {
                          if (e.target.value === "Deserción") {
                            setPopover({ open: true, row: r, col: c });
                            setMotivo(p.motivoDesercion || "");
                          } else {
                            setAsistencia(r, c, e.target.value);
                          }
                        }}
                        className={selectBase}
                        disabled={disabled}
                      >
                        {estados.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {/* Popover para motivo de deserción usando portal */}
                      <PopoverPortal
                        anchorRef={popoverAnchorRefs.current[cellKey]}
                        open={popover.open && popover.row === r && popover.col === c}
                      >
                        <div className="z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64 flex flex-col">
                          <label className="mb-2 font-semibold text-sm text-gray-700">Motivo de la deserción:</label>
                          <textarea
                            className="border rounded p-1 mb-2 text-sm resize-none"
                            rows={3}
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              className="px-3 py-1 rounded bg-green-500 text-white text-sm hover:bg-green-600"
                              onClick={handleGuardarMotivo}
                              disabled={!motivo.trim() || guardando}
                            >
                              {guardando ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              className="px-3 py-1 rounded bg-gray-300 text-gray-700 text-sm hover:bg-gray-400"
                              onClick={handleCancelarMotivo}
                            >Cancelar</button>
                          </div>
                        </div>
                      </PopoverPortal>
                    </td>
                  );
                })}
                {/* Resultado Final */}
                <td className={`${tdBase} text-center min-w-0 ${tieneDesercion ? 'bg-gray-400 text-[#3d3d3d]' : ''}`}>
                  <select
                    className={`${selectBase} rounded text-sm ${tieneDesercion ? 'bg-gray-400 text-[#3d3d3d] cursor-not-allowed' : ''}`}
                    value={p.resultadoFinal || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (postCtx.setResultadoFinal) {
                        postCtx.setResultadoFinal(r, val);
                      } else {
                        postCtx.setTablaDatos(t => {
                          const copy = [...t];
                          copy[r] = { ...copy[r], resultadoFinal: val, dirty: true };
                          return copy;
                        });
                      }
                    }}
                    disabled={tieneDesercion}
                  >
                    <option value=""></option>
                    <option value="Contratado">✅ Contratado</option>
                    <option value="Desaprobado">❌ Desaprobado</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
}
