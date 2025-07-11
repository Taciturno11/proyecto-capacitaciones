export default function AsistenciasTable({ postCtx, compact }) {
  const { dias, tablaDatos, setAsistencia, capCount } = postCtx;
  if (!tablaDatos.length) return null;

  const estados = ["", "A", "J", "T", "F", "Deserción"];
  const manyColumns = dias.length > 15;
  const thBase = manyColumns ? "px-1 py-1 min-w-0 text-xs" : compact ? "px-2 py-1 min-w-0" : "px-4 py-2";
  const tdBase = manyColumns ? "border px-1 py-1 min-w-0 text-xs" : compact ? "border px-2 py-1 min-w-0" : "border px-4 py-2";
  const selectBase = manyColumns ? "w-full h-full px-0.5 py-0.5 min-w-0 focus:outline-none bg-transparent text-xs" : compact ? "w-full h-full px-1 py-0.5 min-w-0 focus:outline-none bg-transparent text-xs" : "w-full h-full px-1 focus:outline-none bg-transparent";

  return (
    
    <div className="rounded-xl w-full p-2 bg-transparent shadow-md">
      <table className="min-w-full text-sm rounded-xl overflow-hidden">
        <thead>
          <tr>
            <th rowSpan={2} className={`${thBase} bg-[#ffe5b4] text-[#3d3d3d] text-left font-semibold border-b border-[#e0d7ce] min-w-[240px]`}>Nombre</th>
            <th rowSpan={2} className={`${thBase} bg-[#ffe5b4] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce] min-w-[90px]`}>DNI</th>
            <th colSpan={capCount}
                className={`${thBase} bg-[#ffe5b4] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce]`}>
              – Capacitación +
            </th>
            {dias.length > capCount && (
              <th colSpan={dias.length - capCount}
                  className={`${thBase} bg-[#e6f4ea] text-[#3d3d3d] text-center font-semibold border-b border-[#e0d7ce]`}>
                – OJT +
              </th>
            )}
          </tr>
          <tr>
            {dias.map((f, i) => (
              <th key={f} className={`${compact ? "px-2 py-1 min-w-[105px]" : "px-2 py-1 min-w-[105px]"} bg-[#f5ede6] text-[#3d3d3d] border-b border-[#e0d7ce]`}>
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
                    ? "bg-red-100"
                    : r % 2 === 0
                      ? "bg-[#f9f6f2]"
                      : "bg-[#f5ede6]"
                }
              >
                <td className={`${tdBase} text-left`}>{p.nombre}</td>
                <td className={`${tdBase} text-center min-w-[90px]`}>{p.dni}</td>
                {dias.map((_, c) => {
                  const valor = p.asistencia[c] || "";
                  if (valor === "---") {
                    return (
                      <td key={c} className={`border p-0 text-center align-middle min-w-[105px] text-gray-400 bg-[#f9f6f2]`}>
                        <span className="select-none">---</span>
                      </td>
                    );
                  }
                  return (
                    <td key={c} className={`${tdBase} min-w-[105px]`}>
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
