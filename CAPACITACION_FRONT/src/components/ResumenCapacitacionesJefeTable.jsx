import React from 'react';
import { api } from '../utils/api';

const DIAS_MAX = 31;
const DIAS_VISIBLES = 7;

export default function ResumenCapacitacionesJefeTable() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const diasHeaderRef = React.useRef(null);
  const [diasOffset, setDiasOffset] = React.useState(0);
  const [diasLeft, setDiasLeft] = React.useState(0);
  const [editIdx, setEditIdx] = React.useState(null);
  const [editValue, setEditValue] = React.useState(null);
  // Guardar Q ENTRE en backend
  const saveQEntre = async (rowIdx, row, value) => {
    setLoading(true);
    try {
      // Extraer CampañaID y DNI_Capacitador del id del row
      const [campaniaId, fechaInicio, dniCapacitador] = row.id.split('_');
      
      await api('/api/qentre-jefe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CampañaID: parseInt(campaniaId),
          FechaInicio: fechaInicio,
          DNI_Capacitador: dniCapacitador,
          qEntre: value
        })
      });
      
      // Actualizar en frontend
      const newRows = [...rows];
      newRows[rowIdx].qEntre = value;
      setRows(newRows);
    } catch (e) {
      console.error('Error al guardar Q ENTRE:', e);
      alert('Error al guardar Q ENTRE');
    }
    setEditIdx(null);
    setEditValue(null);
    setLoading(false);
  };

  React.useEffect(() => {
    setLoading(true);
    api(`/api/capacitaciones/resumen-jefe?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(res => {
        setRows(res.data || []);
        setTotal(res.total || 0);
        setLoading(false);
      });
  }, [page]);

  React.useEffect(() => {
    if (diasHeaderRef.current) {
      const rect = diasHeaderRef.current.getBoundingClientRect();
      const parentRect = diasHeaderRef.current.parentElement.parentElement.parentElement.getBoundingClientRect();
      setDiasLeft(rect.left - parentRect.left);
    }
  }, [diasOffset]);

  const handleScrollLeft = () => {
    setDiasOffset(Math.max(0, diasOffset - 6));
  };
  const handleScrollRight = () => {
    setDiasOffset(Math.min(DIAS_MAX - DIAS_VISIBLES, diasOffset + 6));
  };

  // Paginación real (ya viene paginado del backend)
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginatedRows = rows;

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando resumen...</div>;

  return (
    <div className="rounded-xl shadow bg-white p-4 mt-6">
      <table className="min-w-full text-xs border border-gray-200">
        <thead>
          <tr className="bg-blue-100 text-blue-900">
            <th rowSpan={2} className="px-2 py-1">CAMPAÑA</th>
            <th rowSpan={2} className="px-2 py-1">MODALIDAD</th>
            <th rowSpan={2} className="px-2 py-1">FORMADOR</th>
            <th rowSpan={2} className="px-2 py-1">INICIO CAPA</th>
            <th rowSpan={2} className="px-2 py-1">FECHA FIN OJT</th>
            <th rowSpan={2} className="px-2 py-1">STATUS</th>
            <th rowSpan={2} className="px-2 py-1">Q ENTRE</th>
            <th rowSpan={2} className="px-2 py-1">ESPERADO</th>
            <th rowSpan={2} className="px-2 py-1">LISTA</th>
            <th rowSpan={2} className="px-2 py-1">1er DÍA</th>
            <th rowSpan={2} className="px-2 py-1">% EFEC ATH</th>
            <th rowSpan={2} className="px-2 py-1">RIESGO ATH</th>
            <th colSpan={DIAS_VISIBLES} className="px-1 py-1 text-center" ref={diasHeaderRef}>Días</th>
            <th rowSpan={2} className="px-2 py-1">ACTIVOS</th>
            <th rowSpan={2} className="px-2 py-1">Q BAJAS</th>
            <th rowSpan={2} className="px-2 py-1">% DESER</th>
            <th rowSpan={2} className="px-2 py-1">RIESGO FORM</th>
          </tr>
          <tr className="bg-blue-100 text-blue-900">
            {Array.from({length: DIAS_VISIBLES}, (_, i) => (
              <th key={i} className="px-1 py-1 text-center">{diasOffset + i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((row, idx) => {
            const esperado = row.qEntre * 2;
            let porcentajeEfec = 0;
            let riesgoAth = '---';
            let riesgoAthClass = 'text-gray-500';
            let porcentajeEfecClass = 'bg-gray-50';
            
            // Solo calcular si hay Q ENTRE
            if (row.qEntre && row.qEntre > 0) {
              porcentajeEfec = esperado > 0 ? Math.round((row.primerDia / esperado) * 100) : 0;
              
              if (porcentajeEfec < 60) {
                riesgoAth = 'Riesgo alto';
                riesgoAthClass = 'text-red-700';
                porcentajeEfecClass = 'bg-red-100';
              } else if (porcentajeEfec < 85) {
                riesgoAth = 'Riesgo medio';
                riesgoAthClass = 'text-yellow-700';
                porcentajeEfecClass = 'bg-yellow-100';
              } else {
                riesgoAth = 'Sin riesgo';
                riesgoAthClass = 'text-green-700';
                porcentajeEfecClass = 'bg-green-100';
              }
            }
            
            const status = row.finalizado ? 'Finalizado' : 'En curso';
            return (
              <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-blue-50' : ''}>
                <td className="border px-2 py-1">{row.campania}</td>
                <td className="border px-2 py-1">{row.modalidad}</td>
                <td className="border px-2 py-1">{row.formador}</td>
                <td className="border px-2 py-1">{row.inicioCapa}</td>
                <td className="border px-2 py-1">{row.finOjt}</td>
                <td className="border px-2 py-1">{status}</td>
                <td className="border px-2 py-1 font-bold text-blue-900 cursor-pointer text-center" onClick={() => { setEditIdx(idx); setEditValue(row.qEntre); }}>
                  {editIdx === idx ? (
                    <input
                      type="number"
                      className="w-16 text-center border rounded px-1 py-0.5 outline-none"
                      value={editValue}
                      autoFocus
                      min={1}
                      onChange={e => setEditValue(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => saveQEntre(idx, row, Number(editValue))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          setEditIdx(null); setEditValue(null);
                        }
                      }}
                    />
                  ) : row.qEntre}
                </td>
                <td className="border px-2 py-1 text-center">{esperado}</td>
                <td className="border px-2 py-1 text-center">{row.lista}</td>
                <td className="border px-2 py-1 text-center">{row.primerDia}</td>
                <td className={`border px-2 py-1 text-center ${porcentajeEfecClass}`}>
                  {row.qEntre && row.qEntre > 0 ? `${porcentajeEfec}%` : '---'}
                </td>
                <td className={`border px-2 py-1 ${riesgoAthClass}`}>{riesgoAth}</td>
                {/* Días visibles con scroll */}
                {Array.from({length: DIAS_VISIBLES}, (_, i) => (
                  <td key={i} className="border px-1 py-1 text-center">{row.asistencias && row.asistencias[diasOffset + i] ? row.asistencias[diasOffset + i] : ''}</td>
                ))}
                <td className="border px-2 py-1 text-center">{row.activos}</td>
                <td className="border px-2 py-1 text-center">{row.qBajas}</td>
                <td className="border px-2 py-1 text-center">{row.porcentajeDeser}%</td>
                <td className="border px-2 py-1">{row.riesgoForm}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ width: '100%', position: 'relative', height: 32 }}>
        <div className="flex gap-1" style={{ position: 'absolute', left: diasLeft, top: 0 }}>
          <button onClick={handleScrollLeft} disabled={diasOffset === 0} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs disabled:opacity-40">◀</button>
          <button onClick={handleScrollRight} disabled={diasOffset + DIAS_VISIBLES >= DIAS_MAX} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs disabled:opacity-40">▶</button>
        </div>
      </div>
      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs disabled:opacity-40"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Anterior</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`px-2 py-1 rounded text-xs ${page === i + 1 ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}
              onClick={() => setPage(i + 1)}
            >{i + 1}</button>
          ))}
          <button
            className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs disabled:opacity-40"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Siguiente</button>
        </div>
      )}
    </div>
  );
} 