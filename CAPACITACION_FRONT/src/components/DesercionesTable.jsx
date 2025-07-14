export default function DesercionesTable({ postCtx }) {
  const { deserciones } = postCtx;
  if (!deserciones.length) {
    return (
      <div className="inline-block bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm italic text-gray-500 m-0">Sin deserciones registradas</p>
      </div>
    );
  }
  return (
    <div className="inline-block rounded-xl p-2 bg-transparent">
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2 justify-center">
          <span className="flex-1 h-px bg-gray-200"></span>
          <span className="text-lg font-bold text-white tracking-wide whitespace-nowrap">Tabla de deserciones</span>
          <span className="flex-1 h-px bg-gray-200"></span>
        </div>
      </div>
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
                <div className="w-full bg-transparent text-gray-800 whitespace-pre-line">
                  {d.motivo || <span className="italic text-gray-400">Sin motivo</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
