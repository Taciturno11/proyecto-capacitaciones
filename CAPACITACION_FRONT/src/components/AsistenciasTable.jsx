import { useState } from "react";

export default function AsistenciasTable({ postCtx, compact, dniCap, campania, mes, fechaInicio, capaNum }) {
  const { dias, tablaDatos, setAsistencia, capCount, loadLote } = postCtx;
  const [popover, setPopover] = useState({ open: false, row: null, col: null });
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  if (!tablaDatos.length) return null;

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
        estado_asistencia: "D"
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
        // 3. Recargar lote completo para refrescar la tabla de deserciones y asistencias
        if (typeof loadLote === 'function') {
          const params = {
            dniCap,
            campania,
            mes,
            fechaInicio,
            capaNum: capaNum || 1
          };
          console.log('Recargando lote con:', params);
          await loadLote(params);
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
      <table
        className="min-w-full text-sm rounded-xl overflow-hidden bg-white/80"
        style={dias.length > 10 ? { tableLayout: 'fixed', width: '100%' } : {}}
      >
        <thead>
          <tr>
            {/* Nombre y DNI con fondo beige claro y texto centrado */}
            <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[240px] rounded-tl-xl`}>Nombre</th>
            <th rowSpan={2} className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[90px]`}>DNI</th>
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
            return (
              <tr key={p.dni}
                className={
                  tieneDesercion
                    ? "bg-red-100"
                    : "bg-[#f9f6f2]/80"
                }
              >
                <td className={`${tdBase} text-left`}>{p.nombre}</td>
                <td className={`${tdBase} text-center min-w-[90px]`}>{p.dni}</td>
                {dias.map((_, c) => {
                  const valor = (p.asistencia && p.asistencia.length > c) ? p.asistencia[c] : "";
                  if (valor === "---") {
                    return (
                      <td key={c} className={`border p-0 text-center align-middle min-w-[105px] text-gray-400 bg-[#f9f6f2]/80`}>
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
                  return (
                    <td key={c} className={`${tdBase} min-w-[105px] ${darkBg}`} style={{ position: 'relative' }}>
                      <select
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
                      {/* Popover para motivo de deserción */}
                      {popover.open && popover.row === r && popover.col === c && (
                        <div className="absolute z-20 left-1/2 top-full mt-2 -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64 flex flex-col">
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
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
