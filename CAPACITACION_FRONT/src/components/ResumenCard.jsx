export default function ResumenCard({ postCtx, capInfo, campania }) {
  const { tablaDatos, deserciones } = postCtx;
  if (!tablaDatos.length) return null;

  const total = tablaDatos.length;
  const bajas = deserciones.length;
  const activos = total - bajas;

  return (
    <div className="mt-6 md:w-80 p-6 rounded-xl">
      <div className="rounded-xl backdrop-blur-md p-0 border-0">
        <h2 className="text-2xl font-bold text-gray-800 bg-white rounded-t-xl p-4">Resumen</h2>
        <table className="table-fixed w-full text-sm border-collapse border border-gray-200">
          <tbody>
            <tr className="h-12 bg-white">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">Capacitador</td>
              <td className="border border-gray-200 px-3 py-2 text-center text-gray-900">
                {capInfo ? `${capInfo.nombres} ${capInfo.apellidoPaterno} ${capInfo.apellidoMaterno}` : "-"}
              </td>
            </tr>
            <tr className="h-12 bg-white">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">Campaña</td>
              <td className="border border-gray-200 px-3 py-2 text-center text-gray-900">{campania || "-"}</td>
            </tr>
            <tr className="h-12 bg-gray-100">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">Total Postulantes</td>
              <td className="border border-gray-200 px-3 py-2 text-center text-gray-900">{total}</td>
            </tr>
            <tr className="h-12 bg-red-100">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">Deserciones/Bajas</td>
              <td className="border border-gray-200 px-3 py-2 text-center text-gray-900">{bajas}</td>
            </tr>
            <tr className="h-12 bg-green-100">
              <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">Activos</td>
              <td className="border border-gray-200 px-3 py-2 text-center text-gray-900">{activos}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
