// ❙ utils/excel.js  (idéntico al original) :contentReference[oaicite:1]{index=1}
import ExcelJS from "exceljs";

export async function descargarExcel({ tablaDatos, dias, capCount }) {
  const ojt = dias.length - capCount;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Asistencia");

  // Colores
  const colorBeige = "F5EDE6";
  const colorYellow = "FFE5B4";
  const colorGreen = "C8ECD9";
  const colorBlue = "a6d4f2";
  const colorBlueText = "1e3a5c";
  const colorRed = "FECACA";
  const colorGray = "D1D5DB";
  const colorGrayDark = "b0b0b0";

  // Cabeceras
  const filaGrupo = ["", "", "",
    "Capacitación", ...Array(capCount - 1).fill(""),
    ...(ojt ? ["OJT", ...Array(ojt - 1).fill("")] : [])
  ];
  const filaDia  = ["", "", "", ...dias.map((_, i) => `Día ${i + 1}`)];
  const filaHead = ["Nombre", "DNI", "Número", ...dias, "Resultado Final"];

  ws.addRow(filaGrupo);
  ws.addRow(filaDia);
  ws.addRow(filaHead);

  // Datos
  tablaDatos.forEach(p => {
    ws.addRow([
      p.nombre,
      p.dni,
      p.numero,
      ...p.asistencia,
      p.resultadoFinal || ""
    ]);
  });

  // Anchos de columna
  ws.columns = [
    { width: 25 }, { width: 12 }, { width: 12 },
    ...dias.map(() => ({ width: 10 })),
    { width: 16 }
  ];

  // Merges para cabeceras
  ws.mergeCells(1, 4, 1, 3 + capCount);
  if (ojt) ws.mergeCells(1, 4 + capCount, 1, 3 + capCount + ojt);
  // Merge vertical para Resultado Final
  const colRes = 4 + dias.length;
  ws.mergeCells(1, colRes, 3, colRes);
  ws.getCell(1, colRes).value = "Resultado Final";

  // Estilos de cabecera
  for (let c = 1; c <= 3; ++c) {
    ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBeige } };
    ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBeige } };
    ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBeige } };
    ws.getCell(1, c).font = ws.getCell(2, c).font = ws.getCell(3, c).font = { bold: true };
    ws.getCell(1, c).alignment = ws.getCell(2, c).alignment = ws.getCell(3, c).alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' };
  }
  for (let c = 4; c < 4 + capCount; ++c) {
    ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorYellow } };
    ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorYellow } };
    ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorYellow } };
    ws.getCell(1, c).font = ws.getCell(2, c).font = ws.getCell(3, c).font = { bold: true };
    ws.getCell(1, c).alignment = ws.getCell(2, c).alignment = ws.getCell(3, c).alignment = { vertical: 'middle', horizontal: 'center' };
  }
  for (let c = 4 + capCount; c < 4 + capCount + ojt; ++c) {
    ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGreen } };
    ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGreen } };
    ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGreen } };
    ws.getCell(1, c).font = ws.getCell(2, c).font = ws.getCell(3, c).font = { bold: true };
    ws.getCell(1, c).alignment = ws.getCell(2, c).alignment = ws.getCell(3, c).alignment = { vertical: 'middle', horizontal: 'center' };
  }
  // Resultado Final header (merge vertical)
  ws.getCell(1, colRes).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBlue } };
  ws.getCell(1, colRes).font = { bold: true, color: { argb: colorBlueText } };
  ws.getCell(1, colRes).alignment = { vertical: 'middle', horizontal: 'center' };

  // Bordes de cabecera
  for (let r = 1; r <= 3; ++r) {
    for (let c = 1; c <= 4 + dias.length; ++c) {
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'CCCCCC' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } },
      };
    }
  }

  // Filas de datos
  for (let r = 4; r <= tablaDatos.length + 3; ++r) {
    const p = tablaDatos[r-4];
    const idxDesercion = p.asistencia.findIndex(est => est === "Deserción");
    const esDesercion = idxDesercion !== -1;
    for (let c = 1; c <= 4 + dias.length; ++c) {
      const cell = ws.getCell(r, c);
      // Nombre a la izquierda, resto centrado
      if (c === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'CCCCCC' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } },
      };
      // Si es deserción: rojo solo en las 3 primeras columnas, gris oscuro en fechas
      if (esDesercion) {
        if (c <= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorRed } };
        if (c > 3 && c <= 3 + dias.length) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGrayDark } };
      }
      // Celda de deserción: gris oscuro
      if (c > 3 && c <= 3 + dias.length && esDesercion && (c-4) === idxDesercion) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGrayDark } };
      }
    }
    // Resultado Final: azul si no es deserción, gris si es deserción
    const cellRes = ws.getCell(r, colRes);
    if (esDesercion) cellRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorGray } };
    else cellRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBlue } };
    cellRes.font = { color: { argb: colorBlueText } };
    cellRes.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // Descargar archivo
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'asistencia.xlsx';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
