export default function AsistenciasTable({ postCtx, compact }) {
  const { dias, tablaDatos, setAsistencia, capCount } = postCtx;
  if (!tablaDatos.length) return null;

  const estados = ["", "A", "J", "T", "F", "Deserción"];
  const thBase = compact ? "px-2 py-1 min-w-0" : "px-4 py-2";
  const tdBase = compact ? "border px-2 py-1 min-w-0" : "border px-4 py-2";
  const selectBase = compact ? "w-full h-full px-1 py-0.5 min-w-0 focus:outline-none bg-transparent text-xs" : "w-full h-full px-1 focus:outline-none bg-transparent";

  return (
    
    <div className="rounded-lg shadow bg-white inline-block">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={`${thBase} bg-indigo-100 text-indigo-900 text-left font-semibold border-b border-indigo-200 min-w-[240px]`}>Nombre</th>
            <th rowSpan={2} className={`${thBase} bg-indigo-100 text-indigo-900 text-center font-semibold border-b border-indigo-200 min-w-[90px]`}>DNI</th>
            <th colSpan={capCount}
                className={`${thBase} bg-indigo-200 text-indigo-900 text-center font-semibold border-b border-indigo-200`}>
              – Capacitación +
            </th>
            {dias.length > capCount && (
              <th colSpan={dias.length - capCount}
                  className={`${thBase} bg-teal-200 text-teal-900 text-center font-semibold border-b border-teal-200`}>
                – OJT +
              </th>
            )}
          </tr>
          <tr>
            {dias.map((f, i) => (
              <th key={f} className={`${compact ? "px-2 py-1 min-w-[105px]" : "px-2 py-1 min-w-[105px]"} bg-gray-50 text-gray-700 border-b border-gray-200`}>
                Día {i + 1}<br />{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tablaDatos.map((p, r) => {
            const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
            const tieneDesercion = idxDesercion !== -1;
            return (
              <tr key={p.dni}
                className={
                  tieneDesercion
                    ? ""
                    : p.asistencia.includes("Deserción")
                      ? ""
                      : "odd:bg-gray-50 hover:bg-gray-100 transition"
                }
              >
                <td className={`${tdBase} text-left ${tieneDesercion ? "bg-red-100" : ""}`}>{p.nombre}</td>
                <td className={`${tdBase} text-center min-w-[90px] ${tieneDesercion ? "bg-red-100" : ""}`}>{p.dni}</td>
                {dias.map((_, c) => {
                  const valor = p.asistencia[c] || "";
                  if (valor === "---") {
                    return (
                      <td key={c} className={`border p-0 text-center align-middle min-w-[105px] ${tieneDesercion ? "bg-gray-300" : ""}`}>
                        <span className="text-gray-400 select-none">---</span>
                      </td>
                    );
                  }
                  return (
                    <td key={c} className={`${tdBase} min-w-[105px] ${tieneDesercion ? "bg-gray-300" : ""}`}>
                      <select
                        value={valor}
                        onChange={e => setAsistencia(r, c, e.target.value)}
                        className={selectBase}
                      >
                        {estados.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
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
