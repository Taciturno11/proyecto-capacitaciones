export default function EvaluacionesTable({ postCtx }) {
  const { dias, tablaDatos, evaluaciones, setNota, capCount, deserciones } = postCtx;
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

  return (
    <div className="mt-6 overflow-x-auto rounded-lg shadow bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-4 py-2 bg-indigo-100 text-indigo-900 text-left font-semibold border-b border-indigo-200">Nombre</th>
            <th className="px-4 py-2 bg-indigo-100 text-indigo-900 text-left font-semibold border-b border-indigo-200">DNI</th>
            <th className="px-4 py-2 bg-indigo-100 text-indigo-900 text-left font-semibold border-b border-indigo-200">Número</th>
            {dias.slice(0, capCount).map((d, i) => (
              <th key={d} className="px-2 py-1 bg-gray-50 text-gray-700 border-b border-gray-200 text-center">Día {i + 1}<br />{d}</th>
            ))}
            <th className="border bg-yellow-300 text-center font-bold">Promedio<br />Actual</th>
          </tr>
        </thead>
        <tbody>
          {personasActivas.map((p, r) => {
            const promedio = calcularPromedio(p.dni);
            const promedioDisplay = promedio ? promedio : "---";
            const promedioClass = obtenerClaseColor(promedio);
            return (
              <tr key={p.dni} className="odd:bg-gray-50 hover:bg-gray-100 transition">
                <td className="border px-4 py-2 text-left">{p.nombre}</td>
                <td className="border px-4 py-2">{p.dni}</td>
                <td className="border px-4 py-2">{p.numero}</td>
                {dias.slice(0, capCount).map((d, i) => {
                  const ev = evaluaciones.find(e => e.postulante_dni === p.dni && e.fecha_evaluacion === d);
                  const val = ev ? ev.nota : "";
                  return (
                    <td key={d} className="border px-2 bg-indigo-50">
                      <input
                        type="number" min="0" max="20" step="0.1"
                        className="w-full text-center outline-none bg-transparent"
                        value={val}
                        onChange={e => setNota(p.dni, d, e.target.value === "" ? null : parseFloat(e.target.value))}
                      />
                    </td>
                  );
                })}
                <td className={`border px-2 bg-yellow-50 text-center ${promedioClass}`}>{promedioDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
