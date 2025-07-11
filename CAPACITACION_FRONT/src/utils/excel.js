// ❙ utils/excel.js  (idéntico al original) :contentReference[oaicite:1]{index=1}
import * as XLSX from "xlsx";

export function descargarExcel({ tablaDatos, dias, capCount }) {
  const ojt = dias.length - capCount;
  const filaGrupo = ["", "", "",
    "Capacitación", ...Array(capCount - 1).fill(""),
    ...(ojt ? ["OJT", ...Array(ojt - 1).fill("")] : [])
  ];
  const filaDia  = ["", "", "", ...dias.map((_, i) => `Día ${i + 1}`)];
  const filaHead = ["Nombre", "DNI", "Número", ...dias];

  const aoa = [filaGrupo, filaDia, filaHead];
  tablaDatos.forEach(p =>
    aoa.push([p.nombre, p.dni, p.numero, ...p.asistencia])
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [{ s:{r:0,c:3}, e:{r:0,c:3+capCount-1} }];
  if (ojt) ws["!merges"].push({ s:{r:0,c:3+capCount}, e:{r:0,c:3+capCount+ojt-1} });
  ws["!cols"] = [{wch:25},{wch:12},{wch:12}, ...dias.map(()=>({wch:10}))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
  XLSX.writeFile(wb, "asistencia.xlsx");
}
