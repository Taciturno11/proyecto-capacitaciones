export default function DesercionesTable({ postCtx }) {
  const { deserciones, setDesMotivo } = postCtx;
  if (!deserciones.length) {
    return (
      <div className="inline-block bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm italic text-gray-500 m-0">Sin deserciones registradas</p>
      </div>
    );
  }
  return (
    <>
      <h2 className="text-xl font-bold text-gray-800 mb-0.5 ml-4">Tabla de Deserciones</h2>
      <div className="mt-1 inline-block rounded-xl p-2 bg-transparent">
        <table className="text-sm border-collapse rounded-xl border border-white border-opacity-20 bg-white bg-opacity-20 backdrop-blur-md overflow-hidden">
          <thead>
            <tr className="bg-red-200">
              <th className="border px-4 py-0 w-[340px] whitespace-nowrap">Nombre</th>
              <th className="border px-4 py-0 w-auto">DNI</th>
              <th className="border px-4 py-0 w-auto">Número</th>
              <th className="border px-10 py-0 w-[120px] whitespace-nowrap">Fecha</th>
              <th className="border px-4 min-w-[280px] w-auto">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {deserciones.map(d => (
              <tr key={d.postulante_dni} className="bg-white">
                <td className="border px-2 py-0 w-[340px] whitespace-nowrap truncate">{d.nombre}</td>
                <td className="border px-4 py-0 w-auto text-center">{d.postulante_dni}</td>
                <td className="border px-4 py-0 w-auto text-center">{d.numero}</td>
                <td className="border px-10 py-0 w-[120px] text-center whitespace-nowrap">{d.fecha_desercion}</td>
                <td className="border px-4 py-0 min-w-[280px] w-auto">
                  <input
                    className={`w-full bg-transparent outline-none ${d.guardado ? "opacity-50" : ""}`}
                    value={d.motivo || ""}
                    onChange={e => setDesMotivo(d.postulante_dni, e.target.value)}
                    placeholder="Ingrese el motivo"
                    disabled={d.guardado}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
