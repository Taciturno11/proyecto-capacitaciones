export default function EvaluacionesTable({ postCtx, modo }) {
  const { dias, tablaDatos, evaluaciones, setNota, capCount, deserciones } = postCtx;
  
  // Debug logs
  console.log('[EvaluacionesTable] Props recibidas:', { 
    diasLength: dias?.length, 
    tablaDatosLength: tablaDatos?.length, 
    evaluacionesLength: evaluaciones?.length,
    capCount,
    desercionesLength: deserciones?.length
  });
  console.log('[EvaluacionesTable] Evaluaciones:', evaluaciones);
  
  if (!tablaDatos.length) return null;

  // Helper para calcular promedio
  const calcularPromedio = dni => {
    const notas = evaluaciones.filter(e => e.postulante_dni === dni && e.nota !== null && e.nota !== undefined && e.nota !== "");
    if (!notas.length) return null;
    const suma = notas.reduce((acc, e) => acc + parseFloat(e.nota), 0);
    return (suma / notas.length).toFixed(1);
  };
  // Helper para color
  const obtenerClaseColor = promedio => {
    if (!promedio) return "text-gray-400";
    const nota = parseFloat(promedio);
    if (nota >= 8.5) return "text-green-600 font-bold";
    if (nota >= 6) return "text-yellow-600 font-bold";
    return "text-red-600 font-bold";
  };
  // Filtrar personas activas (no desertores)
  const personasActivas = tablaDatos.filter(p => !deserciones.some(d => d.postulante_dni === p.dni));

  // Lógica de alto y tamaño de fuente igual que AsistenciasTable
  const manyColumns = dias.length >= 14;
  const thBase = manyColumns ? "px-2 py-1 min-w-0 text-xs" : "px-4 py-2";
  const tdBase = manyColumns ? "border px-2 py-1 min-w-0 text-xs" : "border px-4 py-2";

  return (
    <div className={`${manyColumns ? 'w-full' : 'overflow-x-auto'} rounded-xl p-2 bg-transparent`}>
      <table
        className="min-w-full text-sm rounded-xl overflow-hidden bg-white/80"
        style={manyColumns ? { tableLayout: 'fixed', width: '100%' } : {}}
      >
        <thead>
          <tr>
            <th className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-left font-semibold border-b border-[#e0d7ce]`}>Nombre</th>
            <th className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-left font-semibold border-b border-[#e0d7ce]`}>DNI</th>
            <th className={`${thBase} bg-[#f5ede6] text-[#3d3d3d] text-left font-semibold border-b border-[#e0d7ce]`}>Número</th>
            {dias.slice(0, capCount).map((d, i) => (
              <th key={d} className={`${thBase} text-[#3d3d3d] border-b border-[#e0d7ce] text-center ${i < capCount ? 'bg-[#ffe5b4]' : 'bg-[#c8ecd9]'}`}>Día {i + 1}<br />{d}</th>
            ))}
            <th className={`${thBase} border bg-[#fff7e6] text-center font-bold text-[#3d3d3d]`}>Promedio<br />Actual</th>
          </tr>
        </thead>
        <tbody>
          {personasActivas.map((p, r) => {
            const promedio = calcularPromedio(p.dni);
            const promedioDisplay = promedio ? promedio : "---";
            const promedioClass = obtenerClaseColor(promedio);
            // Si alguna evaluación de este postulante está dirty, resaltar la fila
            const isDirty = evaluaciones.some(e => e.postulante_dni === p.dni && e.dirty);
            const dirtyClass = isDirty ? 'ring-2 ring-yellow-400' : '';
            return (
              <tr key={p.dni} className={`bg-[#f9f6f2]/80 ${dirtyClass}`}>
                <td className={`${tdBase} text-left`}>{p.nombre}</td>
                <td className={`${tdBase}`}>{p.dni}</td>
                <td className={`${tdBase}`}>{p.numero}</td>
                {dias.slice(0, capCount).map((d, i) => {
                  const ev = evaluaciones.find(e => e.postulante_dni === p.dni && e.fecha_evaluacion === d);
                  const val = ev ? ev.nota : "";
                  return (
                    <td key={d} className={`${tdBase} min-w-[105px] ${i < capCount ? 'bg-[#fff7e6]' : 'bg-[#c8ecd9]'}`}> 
                      <input
                        type="number" min="0" max="20" step="0.1"
                        className={`w-full text-center outline-none bg-transparent ${manyColumns ? 'text-xs py-1' : ''}`}
                        value={val}
                        onChange={e => setNota(p.dni, d, e.target.value === "" ? null : parseFloat(e.target.value))}
                      />
                    </td>
                  );
                })}
                <td className={`${tdBase} bg-[#fff7e6] text-center ${promedioClass}`}>{promedioDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
