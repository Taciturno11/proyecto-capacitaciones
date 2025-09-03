/* backend/routes/api.js
   --------------------------------------------------------------
   Todas las rutas separadas; usa la conexión global de mssql.
*/
const { Router } = require("express");
const sql        = require("mssql");
const router     = Router();
const jwt = require('jsonwebtoken');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

/* Duración de campañas (idéntico al original) */
const DURACION = {
  "Unificado"         : { cap:14, ojt:5 },
  "Renovacion"        : { cap:5 , ojt:5 },
  "Ventas Hogar INB"  : { cap:5 , ojt:5 },
  "Ventas Hogar OUT"  : { cap:5 , ojt:5 },
  "Ventas Movil INB"  : { cap:5 , ojt:5 },
  "Portabilidad POST" : { cap:5 , ojt:5 },
  "Migracion"         : { cap:3 , ojt:5 },
  "Portabilidad PPA"  : { cap:5 , ojt:5 },
  "Crosselling"       : { cap:8 , ojt:5 } // <-- Actualizado según requerimiento
};

/* Función para normalizar nombres de campaña (compatible hacia atrás) */
function normalizarCampania(nombre) {
  if (!nombre) return nombre;
  
  // Convertir a minúsculas y eliminar espacios extra
  let normalizado = nombre.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Mapeo de variaciones comunes (mantiene compatibilidad)
  const variaciones = {
    'unificado': 'Unificado',
    'renovacion': 'Renovacion',
    'renovación': 'Renovacion',
    'ventas hogar inb': 'Ventas Hogar INB',
    'ventas hogar out': 'Ventas Hogar OUT',
    'ventas movil inb': 'Ventas Movil INB',
    'ventas móvil inb': 'Ventas Movil INB',
    'portabilidad post': 'Portabilidad POST',
    'portabilidad ppa': 'Portabilidad PPA',
    'migracion': 'Migracion',
    'migración': 'Migracion',
    'crosselling': 'Crosselling' // <-- Asegura normalización
  };
  
  // Si existe una variación conocida, usar el nombre canónico
  if (variaciones[normalizado]) {
    return variaciones[normalizado];
  }
  
  // Si no hay variación conocida, devolver el original
  return nombre;
}

/* Función para obtener duración de campaña (con normalización) */
function obtenerDuracion(campania) {
  if (!campania) return { cap:5, ojt:5 };
  
  // Intentar búsqueda directa primero (para compatibilidad)
  if (DURACION[campania]) {
    return DURACION[campania];
  }
  
  // Si no encuentra, normalizar y buscar
  const campaniaNormalizada = normalizarCampania(campania);
  const resultado = DURACION[campaniaNormalizada] || { cap:5, ojt:5 };
  
  return resultado;
}

/* Helper: new Request() con pool global */
const R = () => new sql.Request();

/* ───────────────────── Capacitadores ─────────────────────── */
router.get("/capacitadores", async (_, res) => {
  try {
    const { recordset } = await R().query(`
      SELECT DNI AS dni,
             CONCAT(Nombres,' ',ApellidoPaterno,' ',ApellidoMaterno) AS nombreCompleto
      FROM PRI.Empleados
      WHERE CargoID = 7 AND EstadoEmpleado = 'Activo'
    `);
    res.json(recordset);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

router.get("/capacitadores/:dni", async (req, res) => {
  const { dni } = req.params;
  try {
    const { recordset } = await R()
      .input("dni", sql.VarChar(20), dni)
      .query(`
        SELECT e.DNI, e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno,
               (
                 SELECT DISTINCT pf.CampañaID, c.NombreCampaña
                 FROM Postulantes_En_Formacion pf
                 LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
                 WHERE pf.DNI_Capacitador = e.DNI
                 FOR JSON PATH
               ) AS campañasJson
        FROM PRI.Empleados e
        WHERE e.DNI = @dni
          AND e.CargoID = 7
          AND e.EstadoEmpleado = 'Activo'
      `);
    if (!recordset.length) return res.status(404).end();
    const row = recordset[0];
    res.json({
      dni     : row.DNI,
      nombres : row.Nombres,
      apellidoPaterno : row.ApellidoPaterno,
      apellidoMaterno : row.ApellidoMaterno,
      campañas: JSON.parse(row.campañasJson || "[]")
    });
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ───────────────────── Lotes / capas ─────────────────────── */
router.get("/capas", async (req, res) => {
  const { dniCap, campania, mes } = req.query;      // mes = YYYY-MM
  try {
    let query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY MIN(pf.FechaInicio)) AS capa,
        FORMAT(MIN(pf.FechaInicio),'yyyy-MM-dd') AS fechaInicio,
        pf.CampañaID,
        c.NombreCampaña
      FROM Postulantes_En_Formacion pf
      LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
      WHERE pf.DNI_Capacitador = @dniCap
    `;
    if (campania) query += ` AND pf.CampañaID = @camp`;
    if (mes)      query += ` AND FORMAT(pf.FechaInicio,'yyyy-MM') = @prefijo`;
    query += ` GROUP BY pf.CampañaID, c.NombreCampaña, FORMAT(pf.FechaInicio,'yyyy-MM-dd') ORDER BY fechaInicio`;

    const request = R().input("dniCap", sql.VarChar(20), dniCap);
    if (campania) request.input("camp", sql.Int, Number(campania));
    if (mes)      request.input("prefijo", sql.VarChar(7), mes);

    const { recordset } = await request.query(query);
    res.json(recordset);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ─────────────── Postulantes + asistencias ───────────────── */
router.get('/postulantes', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni; // El DNI del capacitador autenticado
  const { campaniaID, mes, fechaInicio } = req.query;
  try {
    const post = await R()
      .input("dniCap",   sql.VarChar(20),  dniCap)
      .input("camp",     sql.Int, Number(campaniaID))
      .input("prefijo",  sql.VarChar(7),   mes)
      .input("fechaIni", sql.VarChar(10),  fechaInicio)
      .query(`
        SELECT pf.DNI AS dni,
               CONCAT(pf.Nombres,' ',pf.ApellidoPaterno,' ',pf.ApellidoMaterno) AS nombre,
               pf.Telefono AS telefono,
               pf.EstadoPostulante,
               pf.CampañaID,
               c.NombreCampaña,
               pf.ModalidadID,
               m.NombreModalidad,
               pf.JornadaID,
               j.NombreJornada,
               pf.GrupoHorarioID,
               gh.NombreGrupo
        FROM Postulantes_En_Formacion pf
        LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
        LEFT JOIN PRI.ModalidadesTrabajo m ON pf.ModalidadID = m.ModalidadID
        LEFT JOIN PRI.Jornada j ON pf.JornadaID = j.JornadaID
        LEFT JOIN GruposDeHorario gh ON pf.GrupoHorarioID = gh.GrupoID
        WHERE pf.DNI_Capacitador       = @dniCap
          AND pf.CampañaID             = @camp
          AND FORMAT(pf.FechaInicio,'yyyy-MM')   = @prefijo
          AND FORMAT(pf.FechaInicio,'yyyy-MM-dd') = @fechaIni
      `);

    const asis = await R()
      .input("dniCap",   sql.VarChar(20),  dniCap)
      .input("camp",     sql.Int, Number(campaniaID))
      .input("prefijo",  sql.VarChar(7),   mes)
      .input("fechaIni", sql.VarChar(10),  fechaInicio)
      .query(`
        SELECT a.postulante_dni,
               CONVERT(char(10), a.fecha, 23) AS fecha,
               a.estado_asistencia
        FROM Asistencia_Formacion a
        JOIN Postulantes_En_Formacion p ON p.DNI = a.postulante_dni
        WHERE p.DNI_Capacitador       = @dniCap
          AND p.CampañaID             = @camp
          AND a.CampañaID             = @camp
          AND a.fecha >= @fechaIni
          AND FORMAT(p.FechaInicio,'yyyy-MM-dd') = @fechaIni
      `);

    // Obtener el nombre de la campaña del primer postulante (si existe)
    const nombreCampania = post.recordset[0]?.NombreCampaña || '';
    res.json({
      postulantes : post.recordset,
      asistencias : asis.recordset,
      duracion    : obtenerDuracion(nombreCampania)
    });
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ─────────────────── Deserciones ─────────────────────────── */
router.get('/deserciones', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni;
  const { campaniaID, mes, capa } = req.query;
  // Validación estricta de parámetros
  if (!dniCap || !campaniaID || !mes || !capa) {
    return res.status(400).json({ error: "Parámetros inválidos para deserciones", params: { dniCap, campaniaID, mes, capa } });
  }
  try {
    console.log('GET /deserciones params:', { dniCap, campaniaID, mes, capa });
    const { recordset } = await R()
      .input("dniCap", sql.VarChar(20), dniCap)
      .input("camp", sql.Int, Number(campaniaID))
      .input("prefijo", sql.VarChar(7), mes)
      .input("capa", sql.Int, capa)
      .query(`
        SELECT d.postulante_dni,
               p.Nombres + ' ' + p.ApellidoPaterno + ' ' + p.ApellidoMaterno AS nombre,
               p.Telefono AS numero,
               FORMAT(d.fecha_desercion,'yyyy-MM-dd') AS fecha_desercion,
               d.motivo,
               d.capa_numero,
               d.CampañaID,
               c.NombreCampaña,
               d.fecha_inicio
        FROM Deserciones_Formacion d
        JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
          AND p.CampañaID = @camp
          AND CONVERT(varchar, p.FechaInicio, 23) = CONVERT(varchar, d.fecha_inicio, 23)
          AND d.CampañaID = @camp
        LEFT JOIN PRI.Campanias c ON d.CampañaID = c.CampañaID
        WHERE p.DNI_Capacitador = @dniCap
          AND p.CampañaID = @camp
          AND FORMAT(p.FechaInicio,'yyyy-MM') = @prefijo
          AND d.capa_numero = @capa
          AND d.CampañaID = @camp
          AND CONVERT(varchar, p.FechaInicio, 23) = CONVERT(varchar, d.fecha_inicio, 23)
        ORDER BY d.fecha_desercion
      `);
    console.log('GET /deserciones resultado cantidad:', recordset.length);
    console.log('Primeras 3 deserciones:', recordset.slice(0,3));
    res.json(recordset);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* bulk deserciones */
router.post('/deserciones/bulk', authMiddleware, async (req, res) => {
  console.log("=== INICIO GUARDAR DESERCIONES ===");
  console.log("Body completo recibido:", JSON.stringify(req.body, null, 2));
  
  const tx = new sql.Transaction(sql.globalConnection);
  await tx.begin();
  try {
    // Obtener lista de postulantes y capas del lote recibido
    const dniList = req.body.map(r => r.postulante_dni);
    const capaList = req.body.map(r => r.capa_numero);
    const campaniaIDList = req.body.map(r => r.CampañaID);
    const fechaInicioList = req.body.map(r => r.fecha_inicio);

    // Obtener todas las deserciones actuales para esos postulantes/capas
    const { recordset: desercionesActuales } = await tx.request()
      .query(`
        SELECT postulante_dni, capa_numero, CampañaID, fecha_inicio
        FROM Deserciones_Formacion
        WHERE postulante_dni IN (${dniList.map(d => `'${d}'`).join(',')})
          AND capa_numero IN (${capaList.join(',')})
      `);

    // NO eliminar deserciones automáticamente al registrar nuevas
    // Solo se eliminarán cuando se cambie el estado de asistencia
    console.log('Deserciones actuales encontradas:', desercionesActuales.length);
    console.log('No se eliminarán deserciones automáticamente para permitir múltiples deserciones');

    for (const r of req.body) {
      console.log("Procesando deserción:", {
        postulante_dni: r.postulante_dni,
        fecha_desercion: r.fecha_desercion,
        motivo: r.motivo,
        capa_numero: r.capa_numero,
        CampañaID: r.CampañaID,
        tipo_capa_numero: typeof r.capa_numero
      });
      
      let motivoSeguro = null;
      if (typeof r.motivo === 'string' && r.motivo.trim() !== '') {
        motivoSeguro = r.motivo;
      }
      await tx.request()
        .input("dni",      sql.VarChar(20),   r.postulante_dni)
        .input("fechaDes", sql.Date,          r.fecha_desercion)
        .input("mot",      sql.NVarChar(250), motivoSeguro)
        .input("capa",     sql.Int,           r.capa_numero)
        .input("CampañaID", sql.Int,         r.CampañaID)
        .input("fechaInicio", sql.Date,       r.fecha_inicio)
        .query(`
          MERGE Deserciones_Formacion AS T
          USING (SELECT @dni AS dni, @capa AS capa, @CampañaID AS CampañaID, @fechaInicio AS fechaInicio, @fechaDes AS fechaDes) AS S
            ON T.postulante_dni = S.dni AND T.capa_numero = S.capa AND T.CampañaID = S.CampañaID AND T.fecha_inicio = S.fechaInicio AND T.fecha_desercion = S.fechaDes
          WHEN MATCHED THEN
            UPDATE SET motivo = @mot
          WHEN NOT MATCHED THEN
            INSERT (postulante_dni, capa_numero, fecha_desercion, motivo, CampañaID, fecha_inicio)
            VALUES (@dni, @capa, @fechaDes, @mot, @CampañaID, @fechaInicio);
        `);
      // Eliminar cualquier asistencia previa para ese día y capa
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("fechaDes", sql.Date, r.fecha_desercion)
        .input("capa", sql.Int, r.capa_numero)
        .query(`
          DELETE FROM Asistencia_Formacion
          WHERE postulante_dni = @dni AND fecha = @fechaDes AND capa_numero = @capa;
        `);
      // Insertar el registro de asistencia con estado 'D' y capa_numero correcto
      await tx.request()
        .input("dni",    sql.VarChar(20), r.postulante_dni)
        .input("fecha",  sql.Date,        r.fecha_desercion)
        .input("etapa",  sql.VarChar(20), "Capacitacion")
        .input("estado", sql.Char(1),     "D")
        .input("capa",   sql.Int,         r.capa_numero)
        .input("CampañaID", sql.Int,     r.CampañaID)
        .input("fechaInicio", sql.Date,   r.fecha_inicio)
        .query(`
          INSERT INTO Asistencia_Formacion (postulante_dni, fecha, etapa, estado_asistencia, capa_numero, CampañaID, fecha_inicio)
          VALUES (@dni, @fecha, @etapa, @estado, @capa, @CampañaID, @fechaInicio);
        `);
      // NUEVO: Actualizar EstadoPostulante a 'Desertó' SOLO para la capa correcta
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("CampañaID", sql.Int, r.CampañaID)
        .input("fechaInicio", sql.Date, r.fecha_inicio)
        .query(`
          UPDATE Postulantes_En_Formacion
          SET EstadoPostulante = 'Desertó'
          WHERE DNI = @dni AND CampañaID = @CampañaID AND FechaInicio = @fechaInicio;
        `);
      // ELIMINAR ASISTENCIAS POSTERIORES A LA FECHA DE DESERCIÓN
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("fechaDes", sql.Date, r.fecha_desercion)
        .input("capa", sql.Int, r.capa_numero)
        .query(`
          DELETE FROM Asistencia_Formacion
          WHERE postulante_dni = @dni AND fecha > @fechaDes AND capa_numero = @capa;
        `);
      // ACTUALIZAR FECHA DE CESE EN POSTULANTES
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("fechaCese", sql.Date, r.fecha_desercion)
        .input("CampañaID", sql.Int, r.CampañaID)
        .input("fechaInicio", sql.Date, r.fecha_inicio)
        .query(`
          UPDATE Postulantes_En_Formacion
          SET FechaCese = @fechaCese
          WHERE DNI = @dni AND CampañaID = @CampañaID AND FechaInicio = @fechaInicio
        `);
    }
    await tx.commit();
    console.log("=== DESERCIONES GUARDADAS EXITOSAMENTE ===");
    res.json({ ok:true });
  } catch (e) {
    await tx.rollback();
    console.error("=== ERROR AL GUARDAR DESERCIONES ===");
    console.error("Error completo:", e);
    console.error("Mensaje de error:", e.message);
    console.error("Stack trace:", e.stack);
    res.status(500).json({ error:"No se pudo guardar deserciones", details: e.message });
  }
});

/* ─────────────────── Evaluaciones ────────────────────────── */
router.get('/evaluaciones', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni;
  const { campania, mes, fechaInicio } = req.query;
  try {
    const { recordset } = await R()
      .input("dniCap",      sql.VarChar(20),  dniCap)
      .input("camp",        sql.VarChar(100), campania)
      .input("prefijo",     sql.VarChar(7),   mes)
      .input("fechaInicio", sql.VarChar(10),  fechaInicio)
      .query(`
        SELECT e.postulante_dni,
               CONVERT(char(10), e.fecha_evaluacion, 23) AS fecha_evaluacion,
               e.nota
        FROM Evaluaciones_Formacion e
        JOIN Postulantes_En_Formacion p ON p.DNI = e.postulante_dni
        WHERE p.DNI_Capacitador = @dniCap
          AND p.CampañaID         = @camp
          AND FORMAT(p.FechaInicio,'yyyy-MM')    = @prefijo
          AND FORMAT(p.FechaInicio,'yyyy-MM-dd') = @fechaInicio
        ORDER BY e.fecha_evaluacion
      `);
    res.json(recordset);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

router.post('/evaluaciones/bulk', authMiddleware, async (req, res) => {
  console.log("=== INICIO GUARDAR EVALUACIONES ===");
  console.log("Body completo recibido:", JSON.stringify(req.body, null, 2));
  
  const tx = new sql.Transaction(sql.globalConnection);
  await tx.begin();
  try {
    for (const ev of req.body) {
      console.log("Procesando evaluación:", {
        postulante_dni: ev.postulante_dni,
        fecha_evaluacion: ev.fecha_evaluacion,
        nota: ev.nota,
        tipo_nota: typeof ev.nota
      });
      
      await tx.request()
        .input("dni",   sql.VarChar(20), ev.postulante_dni)
        .input("fecha", sql.Date,        ev.fecha_evaluacion)
        .input("nota",  sql.Int,         ev.nota)
        .query(`
MERGE Evaluaciones_Formacion AS T
USING (SELECT @dni AS dni, @fecha AS fecha) AS S
  ON T.postulante_dni = S.dni AND T.fecha_evaluacion = S.fecha
WHEN MATCHED THEN
  UPDATE SET nota = @nota
WHEN NOT MATCHED THEN
  INSERT (postulante_dni,fecha_evaluacion,nota)
  VALUES (@dni,@fecha,@nota);
        `);
    }
    await tx.commit();
    console.log("=== EVALUACIONES GUARDADAS EXITOSAMENTE ===");
    res.json({ ok:true });
  } catch (e) {
    await tx.rollback();
    console.error("=== ERROR AL GUARDAR EVALUACIONES ===");
    console.error("Error completo:", e);
    console.error("Mensaje de error:", e.message);
    console.error("Stack trace:", e.stack);
    res.status(500).json({ error:"No se pudieron guardar evaluaciones", details: e.message });
  }
});

/* ─────────────────── Asistencia ─────────────────────────── */
router.post('/asistencia/bulk', authMiddleware, async (req, res) => {
  console.log("=== INICIO GUARDAR ASISTENCIAS ===");
  console.log("Body completo recibido:", JSON.stringify(req.body, null, 2));
  
  const tx = new sql.Transaction(sql.globalConnection);
  await tx.begin();
  try {
    for (const r of req.body) {
      console.log("Procesando asistencia:", {
        postulante_dni: r.postulante_dni,
        fecha: r.fecha,
        etapa: r.etapa,
        estado_asistencia: r.estado_asistencia,
        capa_numero: r.capa_numero // <--- AGREGADO
      });

      // Si el nuevo estado NO es 'D', eliminar deserción y poner FechaCese en NULL si existe
      if (r.estado_asistencia !== 'D') {
        console.log(`=== ELIMINANDO DESERCIÓN ===`);
        console.log(`DNI: ${r.postulante_dni}`);
        console.log(`CampañaID: ${r.CampañaID}`);
        console.log(`fecha_inicio: ${r.fecha_inicio}`);
        console.log(`estado_asistencia: ${r.estado_asistencia}`);
        
        // Si CampañaID es undefined, intentar obtenerlo de la tabla Postulantes_En_Formacion
        let campaniaID = r.CampañaID;
        if (!campaniaID) {
          console.log(`CampañaID es undefined, buscando en Postulantes_En_Formacion...`);
          const campRes = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('fechaInicio', sql.Date, r.fecha_inicio)
            .query(`
              SELECT CampañaID FROM Postulantes_En_Formacion 
              WHERE DNI = @dni AND FechaInicio = @fechaInicio
            `);
          campaniaID = campRes.recordset[0]?.CampañaID;
          console.log(`CampañaID encontrado: ${campaniaID}`);
        }
        
        if (campaniaID) {
          console.log(`=== EJECUTANDO ELIMINACIÓN ===`);
          console.log(`DNI: ${r.postulante_dni}`);
          console.log(`CampañaID: ${campaniaID}`);
          console.log(`fecha_inicio: ${r.fecha_inicio}`);
          
          // Primero verificar qué deserciones existen
          const checkDeserciones = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('CampañaID', sql.Int, campaniaID)
            .input('fechaInicio', sql.Date, r.fecha_inicio)
            .query(`
              SELECT * FROM Deserciones_Formacion 
              WHERE postulante_dni = @dni 
                AND CampañaID = @CampañaID 
                AND fecha_inicio = @fechaInicio
            `);
          
          // También verificar todas las deserciones de este DNI
          const checkTodasDeserciones = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .query(`
              SELECT * FROM Deserciones_Formacion 
              WHERE postulante_dni = @dni
            `);
          
          console.log(`=== TODAS LAS DESERCIONES DE ESTE DNI ===`);
          console.log(`Cantidad: ${checkTodasDeserciones.recordset.length}`);
          console.log(`Deserciones:`, checkTodasDeserciones.recordset);
          
          console.log(`=== DESERCIONES ENCONTRADAS ===`);
          console.log(`Cantidad: ${checkDeserciones.recordset.length}`);
          console.log(`Deserciones:`, checkDeserciones.recordset);
          
          // Siempre buscar y eliminar deserciones para esta campaña/fecha, independientemente del capa_numero
          const deleteResult = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('CampañaID', sql.Int, campaniaID)
            .input('fechaInicio', sql.Date, r.fecha_inicio)
            .query(`
              DELETE FROM Deserciones_Formacion 
              WHERE postulante_dni = @dni 
                AND CampañaID = @CampañaID 
                AND fecha_inicio = @fechaInicio;
              UPDATE Postulantes_En_Formacion 
              SET FechaCese = NULL, EstadoPostulante = 'Capacitacion'
              WHERE DNI = @dni 
                AND CampañaID = @CampañaID 
                AND FechaInicio = @fechaInicio;
            `);
          
          console.log(`=== RESULTADO ELIMINACIÓN ===`);
          console.log(`Filas afectadas:`, deleteResult.rowsAffected);
          
          // Verificar después de la eliminación
          const checkDespues = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('CampañaID', sql.Int, campaniaID)
            .input('fechaInicio', sql.Date, r.fecha_inicio)
            .query(`
              SELECT * FROM Deserciones_Formacion 
              WHERE postulante_dni = @dni 
                AND CampañaID = @CampañaID 
                AND fecha_inicio = @fechaInicio
            `);
          
          console.log(`=== DESERCIONES DESPUÉS ===`);
          console.log(`Cantidad: ${checkDespues.recordset.length}`);
          console.log(`Deserciones:`, checkDespues.recordset);
        } else {
          console.log(`No se pudo encontrar CampañaID para DNI: ${r.postulante_dni}`);
        }
      }
      // Guardar la asistencia usando capa_numero
      console.log(`=== GUARDANDO ASISTENCIA ===`);
      console.log(`DNI: ${r.postulante_dni}`);
      console.log(`Fecha: ${r.fecha}`);
      console.log(`Estado: ${r.estado_asistencia}`);
      console.log(`CampañaID: ${r.CampañaID}`);
      
      const asistenciaResult = await tx.request()
        .input("dni",    sql.VarChar(20), r.postulante_dni)
        .input("fecha",  sql.Date,        r.fecha)
        .input("etapa",  sql.VarChar(20), r.etapa)
        .input("estado", sql.Char(1),     r.estado_asistencia)
        .input("capa",   sql.Int,         Number(r.capa_numero))
        .input("fechaInicio", sql.Date, r.fecha_inicio)
        .input("CampañaID", sql.Int, r.CampañaID)
        .query(`
MERGE Asistencia_Formacion AS T
USING (SELECT @dni AS dni, @fecha AS fecha, @capa AS capa, @CampañaID AS CampañaID) AS S
  ON T.postulante_dni = S.dni AND T.fecha = S.fecha AND T.capa_numero = S.capa AND T.CampañaID = S.CampañaID
WHEN MATCHED THEN
  UPDATE SET etapa = @etapa, estado_asistencia = @estado, fecha_inicio = @fechaInicio
WHEN NOT MATCHED THEN
  INSERT (postulante_dni,fecha,etapa,estado_asistencia,capa_numero,fecha_inicio,CampañaID)
  VALUES (@dni,@fecha,@etapa,@estado,@capa,@fechaInicio,@CampañaID);
        `);
      
      console.log(`=== RESULTADO ASISTENCIA ===`);
      console.log(`Filas afectadas:`, asistenciaResult.rowsAffected);
    }
    await tx.commit();
    console.log("=== ASISTENCIAS GUARDADAS EXITOSAMENTE ===");
    console.log("Total de registros procesados:", req.body.length);
    res.json({ ok:true, filas:req.body.length });
  } catch (e) {
    await tx.rollback();
    console.error("=== ERROR AL GUARDAR ASISTENCIAS ===");
    console.error("Error completo:", e);
    console.error("Mensaje de error:", e.message);
    console.error("Stack trace:", e.stack);
    res.status(500).json({ error: "No se pudo guardar asistencias", details: e.message });
  }
});
/* ─────────────── Meses disponibles por capacitador ────────────── */
router.get('/meses', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni;
  try {
    const { recordset } = await R()
      .input("dniCap", sql.VarChar(20), dniCap)
      .query(`
        SELECT DISTINCT FORMAT(FechaInicio,'yyyy-MM') AS mes
        FROM Postulantes_En_Formacion
        WHERE DNI_Capacitador = @dniCap
        ORDER BY mes DESC
      `);
    res.json(recordset.map(r => r.mes));
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// Campañas disponibles para la coordinadora
router.get('/dashboard-coordinadora/:dni/campanias', async (req, res) => {
  const dniCoordinadora = req.params.dni;
  try {
    const { recordset } = await R()
      .input('jefeDni', sql.VarChar(20), dniCoordinadora)
      .query(`
        SELECT DISTINCT p.CampañaID, c.NombreCampaña
        FROM Postulantes_En_Formacion p
        LEFT JOIN PRI.Campanias c ON p.CampañaID = c.CampañaID
        WHERE p.DNI_Capacitador IN (
          SELECT DNI FROM PRI.Empleados WHERE CargoID = 7 AND EstadoEmpleado = 'Activo' AND JefeDNI = @jefeDni
        )
        ORDER BY p.CampañaID
      `);
    res.json(recordset.map(r => ({
      id: r.CampañaID,
      nombre: r.NombreCampaña || `Campaña ${r.CampañaID}`
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener campañas' });
  }
});

// Meses disponibles para la coordinadora
router.get('/dashboard-coordinadora/:dni/meses', async (req, res) => {
  const dniCoordinadora = req.params.dni;
  try {
    const { recordset } = await R()
      .input('jefeDni', sql.VarChar(20), dniCoordinadora)
      .query(`
        SELECT DISTINCT FORMAT(FechaInicio,'yyyy-MM') AS mes
        FROM Postulantes_En_Formacion
        WHERE DNI_Capacitador IN (
          SELECT DNI FROM PRI.Empleados WHERE CargoID = 7 AND EstadoEmpleado = 'Activo' AND JefeDNI = @jefeDni
        )
        ORDER BY mes DESC
      `);
    res.json(recordset.map(r => r.mes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener meses' });
  }
});

// Dashboard principal para la coordinadora
router.get('/dashboard-coordinadora/:dni', async (req, res) => {
  const dniCoordinadora = req.params.dni;
  const { campania, mes, capa } = req.query;
  
  console.log('🔍 DEBUG - Dashboard coordinadora llamado con:');
  console.log('  - campania:', campania);
  console.log('  - mes:', mes);
  console.log('  - capa:', capa);
  
  try {
    // 1. Obtener todos los capacitadores bajo la coordinadora
    const capacitadoresResult = await R()
      .input('jefeDni', sql.VarChar(20), dniCoordinadora)
      .query(`
        SELECT DNI, CONCAT(Nombres,' ',ApellidoPaterno,' ',ApellidoMaterno) AS nombreCompleto
        FROM PRI.Empleados
        WHERE CargoID = 7 AND EstadoEmpleado = 'Activo' AND JefeDNI = @jefeDni
      `);
    const capacitadores = capacitadoresResult.recordset;
    if (!capacitadores.length) {
      return res.json({ totales: { postulantes: 0, deserciones: 0, contratados: 0, porcentajeExito: 0 }, capacitadores: [] });
    }
    const dnis = capacitadores.map(c => `'${c.DNI}'`).join(",");

    // 2. Si se especifica capa, necesitamos obtener la FechaInicio correspondiente
    let fechaInicioCapa = null;
    if (capa && campania) {
      const capaResult = await R()
        .input('jefeDni', sql.VarChar(20), dniCoordinadora)
        .input('campania', sql.VarChar(100), campania)
        .input('capa', sql.Int, parseInt(capa))
        .query(`
          SELECT FechaInicio
          FROM (
            SELECT 
              pf.FechaInicio,
              ROW_NUMBER() OVER (PARTITION BY pf.CampañaID ORDER BY pf.FechaInicio DESC) AS capa
            FROM Postulantes_En_Formacion pf
            WHERE pf.DNI_Capacitador IN (
              SELECT DNI FROM PRI.Empleados WHERE CargoID = 7 AND EstadoEmpleado = 'Activo' AND JefeDNI = @jefeDni
            ) AND pf.CampañaID = @campania
            GROUP BY pf.CampañaID, pf.FechaInicio
          ) AS capas
          WHERE capa = @capa
        `);
      
      if (capaResult.recordset.length > 0) {
        fechaInicioCapa = capaResult.recordset[0].FechaInicio;
        console.log('  - FechaInicio de la capa:', fechaInicioCapa);
      } else {
        console.log('  - No se encontró la capa especificada');
      }
    }

    // 3. Obtener postulantes de todos los capacitadores filtrando por campaña y mes
    let queryPostulantes = `
      SELECT DNI, DNI_Capacitador, EstadoPostulante, CampañaID, FORMAT(FechaInicio,'yyyy-MM') AS mes
      FROM Postulantes_En_Formacion
      WHERE DNI_Capacitador IN (${dnis})
    `;
    if (campania) queryPostulantes += ` AND CampañaID = @campania`;
    if (mes) queryPostulantes += ` AND FORMAT(FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryPostulantes += ` AND FechaInicio = @fechaInicioCapa`;
    
    const postulantesResult = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryPostulantes);
    const postulantes = postulantesResult.recordset;

    // 4. Obtener deserciones de todos los capacitadores filtrando por campaña y mes
    let queryDeserciones = `
      SELECT d.postulante_dni, p.DNI_Capacitador
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
    `;
    if (campania) queryDeserciones += ` AND p.CampañaID = @campania`;
    if (mes) queryDeserciones += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryDeserciones += ` AND p.FechaInicio = @fechaInicioCapa`;
    const desercionesResult = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryDeserciones);
    const deserciones = desercionesResult.recordset;

    // 4.1. Obtener deserciones ATH1 (día 1)
    let queryDesercionesATH1 = `
      SELECT d.postulante_dni, p.DNI_Capacitador
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
        AND DATEDIFF(day, p.FechaInicio, d.fecha_desercion) = 0
    `;
    if (campania) queryDesercionesATH1 += ` AND p.CampañaID = @campania`;
    if (mes) queryDesercionesATH1 += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryDesercionesATH1 += ` AND p.FechaInicio = @fechaInicioCapa`;
    const desercionesATH1Result = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryDesercionesATH1);
    const desercionesATH1 = desercionesATH1Result.recordset;

    // 4.2. Obtener deserciones ATH2 (día 2)
    let queryDesercionesATH2 = `
      SELECT d.postulante_dni, p.DNI_Capacitador
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
        AND DATEDIFF(day, p.FechaInicio, d.fecha_desercion) = 1
    `;
    if (campania) queryDesercionesATH2 += ` AND p.CampañaID = @campania`;
    if (mes) queryDesercionesATH2 += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryDesercionesATH2 += ` AND p.FechaInicio = @fechaInicioCapa`;
    const desercionesATH2Result = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryDesercionesATH2);
    const desercionesATH2 = desercionesATH2Result.recordset;

    // 4.3. Obtener deserciones ATH Formación (día 3 en adelante)
    let queryDesercionesATHFormacion = `
      SELECT d.postulante_dni, p.DNI_Capacitador
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
        AND DATEDIFF(day, p.FechaInicio, d.fecha_desercion) >= 2
    `;
    if (campania) queryDesercionesATHFormacion += ` AND p.CampañaID = @campania`;
    if (mes) queryDesercionesATHFormacion += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryDesercionesATHFormacion += ` AND p.FechaInicio = @fechaInicioCapa`;
    const desercionesATHFormacionResult = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryDesercionesATHFormacion);
    const desercionesATHFormacion = desercionesATHFormacionResult.recordset;

    // 3.5. Obtener deserciones que no están en ninguna categoría (para debug)
    let queryDesercionesSinCategoria = `
      SELECT d.postulante_dni, p.DNI_Capacitador, d.fecha_desercion, p.FechaInicio,
             DATEDIFF(day, p.FechaInicio, d.fecha_desercion) AS dias_diferencia
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
        AND DATEDIFF(day, p.FechaInicio, d.fecha_desercion) < 0
    `;
    if (campania) queryDesercionesSinCategoria += ` AND p.CampañaID = @campania`;
    if (mes) queryDesercionesSinCategoria += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryDesercionesSinCategoria += ` AND p.FechaInicio = @fechaInicioCapa`;
    const desercionesSinCategoriaResult = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryDesercionesSinCategoria);
    const desercionesSinCategoria = desercionesSinCategoriaResult.recordset;

    // 3.4. Obtener postulantes del día 2 con estados A+J+T+F para % Éxito
    let queryPostulantesDia2 = `
      SELECT DISTINCT p.DNI, p.DNI_Capacitador
      FROM Postulantes_En_Formacion p
      JOIN Asistencia_Formacion a ON p.DNI = a.postulante_dni
      WHERE p.DNI_Capacitador IN (${dnis})
        AND a.etapa = 'Capacitacion'
        AND DATEDIFF(day, p.FechaInicio, a.fecha) = 1
        AND a.estado_asistencia IN ('A', 'J', 'T', 'F')
    `;
    if (campania) queryPostulantesDia2 += ` AND p.CampañaID = @campania`;
    if (mes) queryPostulantesDia2 += ` AND FORMAT(p.FechaInicio,'yyyy-MM') = @mes`;
    if (fechaInicioCapa) queryPostulantesDia2 += ` AND p.FechaInicio = @fechaInicioCapa`;
    const postulantesDia2Result = await R()
      .input('campania', sql.VarChar(100), campania || null)
      .input('mes', sql.VarChar(7), mes || null)
      .input('fechaInicioCapa', sql.Date, fechaInicioCapa || null)
      .query(queryPostulantesDia2);
    const postulantesDia2 = postulantesDia2Result.recordset;

    // 4. KPIs generales
    const totalPostulantes = postulantes.length;
    const totalDeserciones = deserciones.length;
    const totalDesercionesATH1 = desercionesATH1.length;
    const totalDesercionesATH2 = desercionesATH2.length;
    const totalDesercionesATHFormacion = desercionesATHFormacion.length;
    const totalContratados = postulantes.filter(p => p.EstadoPostulante === 'Contratado').length;
    const totalPostulantesDia2 = postulantesDia2.length;
    const porcentajeExito = totalPostulantesDia2 > 0 ? Math.round((totalContratados / totalPostulantesDia2) * 100) : 0;
    
    // Calcular porcentajes de deserciones
    const porcentajeDesercionesATH1 = totalPostulantes > 0 ? Math.round((totalDesercionesATH1 / totalPostulantes) * 100) : 0;
    const porcentajeDesercionesATH2 = totalPostulantes > 0 ? Math.round((totalDesercionesATH2 / totalPostulantes) * 100) : 0;
    const porcentajeDesercionesATHFormacion = totalPostulantes > 0 ? Math.round((totalDesercionesATHFormacion / totalPostulantes) * 100) : 0;

    // Calcular deserciones totales como suma de las específicas
    const totalDesercionesCalculado = totalDesercionesATH1 + totalDesercionesATH2 + totalDesercionesATHFormacion;

    // Debug logs
    console.log('=== DEBUG % ÉXITO ===');
    console.log('Total postulantes:', totalPostulantes);
    console.log('Total contratados:', totalContratados);
    console.log('Total postulantes día 2:', totalPostulantesDia2);
    console.log('Cálculo:', `${totalContratados} / ${totalPostulantesDia2} × 100 = ${porcentajeExito}%`);
    console.log('Postulantes día 2:', postulantesDia2.map(p => p.DNI));
    console.log('=====================');
    
    // Debug logs para deserciones
    console.log('=== DEBUG DESERCIONES ===');
    console.log('Total deserciones:', totalDeserciones);
    console.log('Deserciones ATH1:', totalDesercionesATH1);
    console.log('Deserciones ATH2:', totalDesercionesATH2);
    console.log('Deserciones Formación:', totalDesercionesATHFormacion);
    console.log('Suma específicas:', totalDesercionesCalculado);
    console.log('Diferencia:', totalDeserciones - totalDesercionesCalculado);
    
    // Detalles de cada tipo de deserción
    console.log('DNIs ATH1:', desercionesATH1.map(d => d.postulante_dni));
    console.log('DNIs ATH2:', desercionesATH2.map(d => d.postulante_dni));
    console.log('DNIs Formación:', desercionesATHFormacion.map(d => d.postulante_dni));
    
    // Verificar deserciones totales
    console.log('DNIs Deserciones totales:', deserciones.map(d => d.postulante_dni));
    
    // Verificar deserciones sin categoría
    console.log('Deserciones sin categoría (DATEDIFF < 0):', desercionesSinCategoria.length);
    console.log('Detalles deserciones sin categoría:', desercionesSinCategoria.map(d => ({
      dni: d.postulante_dni,
      fechaDesercion: d.fecha_desercion,
      fechaInicio: d.FechaInicio,
      diasDiferencia: d.dias_diferencia
    })));
    console.log('=====================');

    // 5. Métricas por capacitador
    const tablaCapacitadores = capacitadores.map(cap => {
      const posts = postulantes.filter(p => p.DNI_Capacitador === cap.DNI);
      const postulantesCount = posts.length;
      const desercionesCount = deserciones.filter(d => d.DNI_Capacitador === cap.DNI).length;
      const contratadosCount = posts.filter(p => p.EstadoPostulante === 'Contratado').length;
      const porcentaje = postulantesCount > 0 ? Math.round((contratadosCount / postulantesCount) * 100) : 0;
      
      // Deserciones específicas por capacitador
      const desercionesATH1Count = desercionesATH1.filter(d => d.DNI_Capacitador === cap.DNI).length;
      const desercionesATH2Count = desercionesATH2.filter(d => d.DNI_Capacitador === cap.DNI).length;
      const desercionesATHFormacionCount = desercionesATHFormacion.filter(d => d.DNI_Capacitador === cap.DNI).length;
      
      return {
        dni: cap.DNI,
        nombreCompleto: cap.nombreCompleto,
        postulantes: postulantesCount,
        deserciones: desercionesCount,
        desercionesATH1: desercionesATH1Count,
        desercionesATH2: desercionesATH2Count,
        desercionesATHFormacion: desercionesATHFormacionCount,
        contratados: contratadosCount,
        porcentajeExito: porcentaje
      };
    });

    res.json({
      totales: {
        postulantes: totalPostulantes,
        postulantesDia2: totalPostulantesDia2,
        deserciones: totalDesercionesCalculado,
        desercionesATH1: totalDesercionesATH1,
        porcentajeDesercionesATH1: porcentajeDesercionesATH1,
        desercionesATH2: totalDesercionesATH2,
        porcentajeDesercionesATH2: porcentajeDesercionesATH2,
        desercionesATHFormacion: totalDesercionesATHFormacion,
        porcentajeDesercionesATHFormacion: porcentajeDesercionesATHFormacion,
        contratados: totalContratados,
        porcentajeExito
      },
      capacitadores: tablaCapacitadores
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener dashboard', details: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const result = await R()
      .input('dni', sql.VarChar(20), usuario)
      .query(`
        SELECT DNI, Nombres, ApellidoPaterno, ApellidoMaterno, CargoID
        FROM PRI.Empleados
        WHERE (CargoID = 7 OR CargoID = 8) AND DNI = @dni
      `);

    const user = result.recordset[0];
    if (!user || user.DNI !== contrasena) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Determinar rol
    let rol = 'capacitador';
    if (user.CargoID === 8) rol = 'coordinadora';

    // Generar token JWT
    const token = jwt.sign(
      { dni: user.DNI, nombre: user.Nombres, rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      dni: user.DNI,
      nombres: user.Nombres,
      apellidoPaterno: user.ApellidoPaterno,
      apellidoMaterno: user.ApellidoMaterno,
      cargoID: user.CargoID,
      rol
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { dni, nombre }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Endpoint para actualizar el estado final de los postulantes
router.post('/postulantes/estado', async (req, res) => {
  // Espera un array: [{ dni, estado, CampañaID, fecha_inicio }]
  console.log('POST /postulantes/estado body:', req.body);
  const tx = new sql.Transaction(sql.globalConnection);
  await tx.begin();
  try {
    for (const p of req.body) {
      console.log('Actualizando:', { dni: p.dni, CampañaID: p.CampañaID, fecha_inicio: p.fecha_inicio, estado: p.estado, fechaCese: p.fechaCese });
      if (p.estado === 'Desaprobado' && p.fechaCese) {
        await tx.request()
          .input("dni", sql.VarChar(20), p.dni)
          .input("CampañaID", sql.Int, Number(p.CampañaID))
          .input("fechaInicio", sql.Date, p.fecha_inicio)
          .input("estado", sql.VarChar(20), p.estado)
          .input("fechaCese", sql.Date, p.fechaCese)
          .query(`
            UPDATE Postulantes_En_Formacion
            SET EstadoPostulante = @estado, FechaCese = @fechaCese
            WHERE DNI = @dni AND CampañaID = @CampañaID AND FechaInicio = @fechaInicio
          `);
      } else if (p.estado === 'Contratado') {
        await tx.request()
          .input("dni", sql.VarChar(20), p.dni)
          .input("CampañaID", sql.Int, Number(p.CampañaID))
          .input("fechaInicio", sql.Date, p.fecha_inicio)
          .input("estado", sql.VarChar(20), p.estado)
          .query(`
            UPDATE Postulantes_En_Formacion
            SET EstadoPostulante = @estado, FechaCese = NULL
            WHERE DNI = @dni AND CampañaID = @CampañaID AND FechaInicio = @fechaInicio
          `);
      } else {
        await tx.request()
          .input("dni", sql.VarChar(20), p.dni)
          .input("CampañaID", sql.Int, Number(p.CampañaID))
          .input("fechaInicio", sql.Date, p.fecha_inicio)
          .input("estado", sql.VarChar(20), p.estado)
          .query(`
            UPDATE Postulantes_En_Formacion
            SET EstadoPostulante = @estado
            WHERE DNI = @dni AND CampañaID = @CampañaID AND FechaInicio = @fechaInicio
          `);
      }
    }
    await tx.commit();
    res.json({ ok: true });
  } catch (e) {
    await tx.rollback();
    res.status(500).json({ error: "No se pudo actualizar el estado final", details: e.message });
  }
});

// Endpoint para actualizar GrupoHorarioID según nombreGrupo
router.post('/postulantes/horario', async (req, res) => {
  const lista = req.body; // [{ dni, nombreGrupo }]
  if (!Array.isArray(lista)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }
  const sql = require('mssql');
  const pool = sql.globalConnection || await sql.connect(process.env.DB_CONNECTION_STRING);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const p of lista) {
      // Buscar el GrupoID correspondiente al nombreGrupo
      const result = await tx.request()
        .input('nombreGrupo', sql.VarChar(255), p.nombreGrupo)
        .query('SELECT GrupoID FROM GruposDeHorario WHERE NombreGrupo = @nombreGrupo');
      const grupo = result.recordset[0];
      if (!grupo) continue; // Si no existe, no actualiza

      await tx.request()
        .input('dni', sql.VarChar(20), p.dni)
        .input('grupoID', sql.Int, grupo.GrupoID)
        .query(`
          UPDATE Postulantes_En_Formacion
          SET GrupoHorarioID = @grupoID
          WHERE DNI = @dni
        `);
    }
    await tx.commit();
    res.json({ ok: true });
  } catch (e) {
    await tx.rollback();
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar GrupoHorarioID', details: e.message });
  }
});

// Endpoint para obtener todos los grupos de horario base (solo Desc. Dom)
router.get('/horarios-base', async (req, res) => {
  try {
    const pool = sql.globalConnection || await sql.connect(process.env.DB_CONNECTION_STRING);
    const result = await pool.request().query(`
      SELECT 
        g.GrupoID,
        g.NombreGrupo AS label,
        -- Extraer Jornada y Turno del nombre del grupo
        CASE 
          WHEN g.NombreGrupo LIKE 'Full Time%' THEN 'Full Time'
          WHEN g.NombreGrupo LIKE 'Part Time%' THEN 'Part Time'
          WHEN g.NombreGrupo LIKE 'Semi Full%' THEN 'Semi Full'
          ELSE ''
        END AS jornada,
        CASE 
          WHEN g.NombreGrupo LIKE '%Mañana%' THEN 'Mañana'
          WHEN g.NombreGrupo LIKE '%Tarde%' THEN 'Tarde'
          ELSE ''
        END AS turno,
        -- Extraer Descanso
        CASE 
          WHEN g.NombreGrupo LIKE '%(Desc. Dom)%' THEN 'Dom'
          WHEN g.NombreGrupo LIKE '%(Desc. Lun)%' THEN 'Lun'
          WHEN g.NombreGrupo LIKE '%(Desc. Mar)%' THEN 'Mar'
          WHEN g.NombreGrupo LIKE '%(Desc. Mie)%' THEN 'Mie'
          WHEN g.NombreGrupo LIKE '%(Desc. Jue)%' THEN 'Jue'
          WHEN g.NombreGrupo LIKE '%(Desc. Vie)%' THEN 'Vie'
          WHEN g.NombreGrupo LIKE '%(Desc. Sab)%' THEN 'Sab'
          ELSE ''
        END AS descanso,
        -- Rango horario
        CONVERT(char(5), h.HoraEntrada, 108) + ' - ' + CONVERT(char(5), h.HoraSalida, 108) AS rango
      FROM GruposDeHorario g
      JOIN Horarios_Base h ON h.NombreHorario = LEFT(g.NombreGrupo, CHARINDEX(' (Desc.', g.NombreGrupo)-1)
      WHERE g.NombreGrupo LIKE '%(Desc. Dom)'
      ORDER BY jornada, turno, rango
    `);
    res.json(result.recordset);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener horarios base', details: e.message });
  }
});

// ───────────────────── Configuración de Multer ─────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: dni_timestamp.extensión
    const dni = req.user.dni;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${dni}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: function (req, file, cb) {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// ───────────────────── Endpoints de Fotos ─────────────────────
// Subir foto de perfil
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const dni = req.user.dni;
    const filename = req.file.filename;
    const photoUrl = `/uploads/${filename}`;

    // Actualizar la base de datos con la nueva foto
    await R()
      .input('dni', sql.VarChar(20), dni)
      .input('fotoPerfil', sql.VarChar(255), photoUrl)
      .query(`
        UPDATE PRI.Empleados 
        SET FotoPerfil = @fotoPerfil 
        WHERE DNI = @dni
      `);

    res.json({ 
      success: true, 
      photoUrl,
      message: 'Foto subida exitosamente' 
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// Obtener foto de perfil del capacitador
router.get('/photo/:dni', async (req, res) => {
  try {
    const { dni } = req.params;
    const result = await R()
      .input('dni', sql.VarChar(20), dni)
      .query(`
        SELECT FotoPerfil 
        FROM PRI.Empleados 
        WHERE DNI = @dni
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const fotoPerfil = result.recordset[0].FotoPerfil;
    res.json({ photoUrl: fotoPerfil });
  } catch (error) {
    console.error('Error al obtener foto:', error);
    res.status(500).json({ error: 'Error al obtener la foto' });
  }
});

// Eliminar foto de perfil
router.delete('/photo', authMiddleware, async (req, res) => {
  try {
    const dni = req.user.dni;
    
    // Obtener la foto actual
    const result = await R()
      .input('dni', sql.VarChar(20), dni)
      .query(`
        SELECT FotoPerfil 
        FROM PRI.Empleados 
        WHERE DNI = @dni
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const fotoPerfil = result.recordset[0].FotoPerfil;
    
    // Eliminar archivo físico si existe
    if (fotoPerfil && fotoPerfil.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', fotoPerfil);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Actualizar base de datos
    await R()
      .input('dni', sql.VarChar(20), dni)
      .query(`
        UPDATE PRI.Empleados 
        SET FotoPerfil = NULL 
        WHERE DNI = @dni
      `);

    res.json({ 
      success: true, 
      message: 'Foto eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

/* ───────────────────── Fotos de Perfil ───────────────────── */
// Crear tabla si no existe
router.post("/fotos-perfil/init", async (req, res) => {
  try {
    await R().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Fotos_Perfil' AND xtype='U')
      CREATE TABLE Fotos_Perfil (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dni VARCHAR(20) NOT NULL UNIQUE,
        foto_url VARCHAR(500) NOT NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_actualizacion DATETIME DEFAULT GETDATE()
      )
    `);
    res.json({ message: "Tabla Fotos_Perfil creada o ya existía" });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: "Error al crear tabla" }); 
  }
});

// Subir foto de perfil
router.post("/fotos-perfil/upload", authMiddleware, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó archivo" });
    }

    const dni = req.user.dni;
    const fotoUrl = `/uploads/${req.file.filename}`;

    // Insertar o actualizar en la tabla Fotos_Perfil
    await R()
      .input("dni", sql.VarChar(20), dni)
      .input("fotoUrl", sql.VarChar(500), fotoUrl)
      .query(`
        MERGE Fotos_Perfil AS target
        USING (SELECT @dni AS dni, @fotoUrl AS foto_url) AS source
        ON target.dni = source.dni
        WHEN MATCHED THEN
          UPDATE SET 
            foto_url = source.foto_url,
            fecha_actualizacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (dni, foto_url)
          VALUES (source.dni, source.foto_url);
      `);

    res.json({ 
      success: true, 
      fotoUrl,
      message: "Foto de perfil actualizada correctamente" 
    });
  } catch (e) {
    console.error("Error al subir foto:", e);
    res.status(500).json({ error: "Error al subir foto de perfil" });
  }
});

// Obtener foto de perfil
router.get("/fotos-perfil/:dni", async (req, res) => {
  try {
    const { dni } = req.params;
    const { recordset } = await R()
      .input("dni", sql.VarChar(20), dni)
      .query(`
        SELECT foto_url, fecha_creacion, fecha_actualizacion
        FROM Fotos_Perfil
        WHERE dni = @dni
      `);

    if (recordset.length === 0) {
      return res.status(404).json({ error: "Foto no encontrada" });
    }

    res.json(recordset[0]);
  } catch (e) {
    console.error("Error al obtener foto:", e);
    res.status(500).json({ error: "Error al obtener foto de perfil" });
  }
});

// Eliminar foto de perfil
router.delete("/fotos-perfil/:dni", authMiddleware, async (req, res) => {
  try {
    const dni = req.user.dni;
    
    // Verificar que el usuario solo puede eliminar su propia foto
    if (dni !== req.params.dni) {
      return res.status(403).json({ error: "No autorizado para eliminar esta foto" });
    }

    // Obtener la URL de la foto antes de eliminar
    const { recordset } = await R()
      .input("dni", sql.VarChar(20), dni)
      .query(`
        SELECT foto_url FROM Fotos_Perfil WHERE dni = @dni
      `);

    if (recordset.length === 0) {
      return res.status(404).json({ error: "Foto no encontrada" });
    }

    const fotoUrl = recordset[0].foto_url;
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(fotoUrl));

    // Eliminar de la base de datos
    await R()
      .input("dni", sql.VarChar(20), dni)
      .query(`
        DELETE FROM Fotos_Perfil WHERE dni = @dni
      `);

    // Eliminar archivo físico
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ 
      success: true, 
      message: "Foto de perfil eliminada correctamente" 
    });
  } catch (e) {
    console.error("Error al eliminar foto:", e);
    res.status(500).json({ error: "Error al eliminar foto de perfil" });
  }
});

// Endpoint real para resumen de capacitaciones de la jefa con paginación
router.get('/capacitaciones/resumen-jefe', async (req, res) => {
  // Parámetros de paginación y filtros
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const campania = req.query.campania;
  const formador = req.query.formador;
  const estado = req.query.estado;
  
  try {
    // Construir query base con filtros
    let query = `
      SELECT pf.CampañaID, pf.FechaInicio, pf.DNI_Capacitador, c.NombreCampaña, m.NombreModalidad,
             pf.DNI_Capacitador AS formadorDNI, pf.FechaInicio AS inicioCapa,
             pf.ModalidadID, pf.CampañaID,
             e.Nombres + ' ' + e.ApellidoPaterno + ' ' + e.ApellidoMaterno AS formador
      FROM Postulantes_En_Formacion pf
      LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
      LEFT JOIN PRI.ModalidadesTrabajo m ON pf.ModalidadID = m.ModalidadID
      LEFT JOIN PRI.Empleados e ON pf.DNI_Capacitador = e.DNI
      WHERE pf.FechaInicio IS NOT NULL
    `;
    
    // Agregar filtros si están presentes
    if (campania) {
      query += ` AND c.NombreCampaña = @campania`;
    }
    if (formador) {
      query += ` AND e.Nombres + ' ' + e.ApellidoPaterno + ' ' + e.ApellidoMaterno = @formador`;
    }
    
    query += ` GROUP BY pf.CampañaID, pf.FechaInicio, pf.DNI_Capacitador, c.NombreCampaña, m.NombreModalidad, pf.ModalidadID, e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno`;
    
    // Ejecutar query con parámetros
    const request = R();
    if (campania) request.input('campania', sql.VarChar(100), campania);
    if (formador) request.input('formador', sql.VarChar(200), formador);
    
    const lotes = await request.query(query);
    let rows = lotes.recordset;

    // 2. Traer Q ENTRE para cada lote
    const qEntreRows = await R().query(`SELECT CampañaID, FechaInicio, DNI_Capacitador, qEntre FROM QEntre_Jefe`);
    const qEntreMap = {};
    qEntreRows.recordset.forEach(q => {
      qEntreMap[`${q.CampañaID}_${q.FechaInicio.toISOString().slice(0,10)}_${q.DNI_Capacitador}`] = q.qEntre;
    });

    // 3. Traer lista de postulantes por lote
    const postRows = await R().query(`
      SELECT CampañaID, FechaInicio, DNI_Capacitador, COUNT(*) AS lista
      FROM Postulantes_En_Formacion
      WHERE FechaInicio IS NOT NULL
      GROUP BY CampañaID, FechaInicio, DNI_Capacitador
    `);
    const listaMap = {};
    postRows.recordset.forEach(p => {
      listaMap[`${p.CampañaID}_${p.FechaInicio.toISOString().slice(0,10)}_${p.DNI_Capacitador}`] = p.lista;
    });
    console.log('DEBUG: Lista de postulantes encontrados:', postRows.recordset.length);
    console.log('DEBUG: Primeros 3 registros de lista:', postRows.recordset.slice(0, 3));

    // 4. Traer asistencias por lote y día (eliminando duplicados)
    const asisRows = await R().query(`
      SELECT DISTINCT p.CampañaID, p.FechaInicio, a.fecha, a.estado_asistencia, p.DNI_Capacitador, a.postulante_dni
      FROM Asistencia_Formacion a
      JOIN Postulantes_En_Formacion p ON a.postulante_dni = p.DNI 
        AND a.fecha_inicio = p.FechaInicio
        AND a.CampañaID = p.CampañaID
      WHERE p.FechaInicio IS NOT NULL
    `);
    console.log('DEBUG: Total asistencias encontradas:', asisRows.recordset.length);
    console.log('DEBUG: Primeras 5 asistencias:', asisRows.recordset.slice(0, 5));
    
    // Debug específico para Josep (75707924)
    const asistenciasJosep = asisRows.recordset.filter(a => a.DNI_Capacitador === '75707924');
    console.log('DEBUG JOSEP: Total asistencias para Josep:', asistenciasJosep.length);
    console.log('DEBUG JOSEP: Asistencias específicas:', asistenciasJosep);
    
    // Debug adicional: verificar si hay asistencias para la campaña Hogar específicamente
    const asistenciasJosepHogar = asistenciasJosep.filter(a => {
      const key = `${a.CampañaID}_${a.FechaInicio.toISOString().slice(0,10)}_${a.DNI_Capacitador}`;
      return key.includes('2025-07-02'); // Fecha específica del problema
    });
    console.log('DEBUG JOSEP HOGAR: Asistencias para Hogar 2025-07-02:', asistenciasJosepHogar);
    const asisMap = {};
    asisRows.recordset.forEach(a => {
      const key = `${a.CampañaID}_${a.FechaInicio.toISOString().slice(0,10)}_${a.DNI_Capacitador}`;
      if (!asisMap[key]) asisMap[key] = {};
      if (!asisMap[key][a.fecha.toISOString().slice(0,10)]) {
        asisMap[key][a.fecha.toISOString().slice(0,10)] = [];
      }
      asisMap[key][a.fecha.toISOString().slice(0,10)].push(a.estado_asistencia);
    });

    // 5. Traer bajas por lote (solo del día 3 en adelante)
    // Primero traer todas las deserciones y luego filtrar por días laborables
    const todasDeserciones = await R().query(`
      SELECT d.postulante_dni, d.fecha_desercion, p.CampañaID, p.FechaInicio, p.DNI_Capacitador
      FROM Deserciones_Formacion d
      JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni 
        AND p.CampañaID = d.CampañaID
        AND p.FechaInicio = d.fecha_inicio
      WHERE p.FechaInicio IS NOT NULL
    `);
    
    // Función para calcular días laborables entre dos fechas
    const calcularDiasLaborables = (fechaInicio, fechaDesercion) => {
      const inicio = new Date(fechaInicio);
      const desercion = new Date(fechaDesercion);
      let diasLaborables = 0;
      let fechaActual = new Date(inicio);
      
      while (fechaActual <= desercion) {
        if (fechaActual.getDay() !== 0) { // Excluir domingos
          diasLaborables++;
        }
        fechaActual.setDate(fechaActual.getDate() + 1);
      }
      return diasLaborables;
    };
    
    // Filtrar deserciones del día 3 en adelante (días laborables)
    const desercionesFiltradas = todasDeserciones.recordset.filter(d => {
      const diasLaborables = calcularDiasLaborables(d.FechaInicio, d.fecha_desercion);
      return diasLaborables >= 3;
    });
    
    // Agrupar por lote
    const bajasMap = {};
    desercionesFiltradas.forEach(d => {
      const key = `${d.CampañaID}_${d.FechaInicio.toISOString().slice(0,10)}_${d.DNI_Capacitador}`;
      if (!bajasMap[key]) bajasMap[key] = 0;
      bajasMap[key]++;
    });
    
    console.log('DEBUG: Total deserciones encontradas:', todasDeserciones.recordset.length);
    console.log('DEBUG: Deserciones filtradas (día 3+):', desercionesFiltradas.length);
    console.log('DEBUG: Bajas por lote:', bajasMap);

    // 6. Armar los datos finales
    let allRows = rows.map(lote => {
      // Limpiar CampañaID si tiene comas
      const campaniaId = String(lote.CampañaID).split(',')[0];
      const key = `${campaniaId}_${lote.FechaInicio.toISOString().slice(0,10)}_${lote.DNI_Capacitador}`;
      console.log(`DEBUG KEY: ${key}`);
      console.log(`DEBUG listaMap keys:`, Object.keys(listaMap));
      console.log(`DEBUG bajasMap keys:`, Object.keys(bajasMap));
      
      // Debug específico para Josep
      if (lote.DNI_Capacitador === '75707924') {
        console.log(`DEBUG JOSEP - Procesando lote: ${lote.NombreCampaña} - ${lote.FechaInicio.toISOString().slice(0,10)}`);
        console.log(`DEBUG JOSEP - Key generada: ${key}`);
        console.log(`DEBUG JOSEP - ¿Existe en asisMap?`, !!asisMap[key]);
        if (asisMap[key]) {
          console.log(`DEBUG JOSEP - Fechas disponibles:`, Object.keys(asisMap[key]));
        }
      }
      
      const qEntre = qEntreMap[key] || 0;
      const esperado = qEntre * 2;
      const lista = listaMap[key] || 0;
      // Primer día (asistencia)
      const primerDiaFecha = lote.FechaInicio.toISOString().slice(0,10);
      let primerDia = 0;
      // Contar cuántos tienen asistencia 'A' en el primer día específico
      if (asisMap[key] && asisMap[key][primerDiaFecha]) {
        // Contar cuántos postulantes tienen asistencia 'A' en el primer día
        primerDia = asisMap[key][primerDiaFecha].filter(estado => estado === 'A').length;
        console.log(`DEBUG ${lote.NombreCampaña} - Primer día: ${primerDiaFecha}, Asistencias totales: ${asisMap[key][primerDiaFecha].length}, Asistencias 'A': ${primerDia}`);
      }
      
      // Debug específico para Josep - primer día
      if (lote.DNI_Capacitador === '75707924') {
        console.log(`DEBUG JOSEP - Primer día fecha: ${primerDiaFecha}`);
        console.log(`DEBUG JOSEP - ¿Tiene asistencias en primer día?`, !!(asisMap[key] && asisMap[key][primerDiaFecha]));
        if (asisMap[key] && asisMap[key][primerDiaFecha]) {
          console.log(`DEBUG JOSEP - Asistencias primer día:`, asisMap[key][primerDiaFecha]);
        }
      }
      // % EFEC ATH
      const porcentajeEfec = esperado > 0 ? Math.round((primerDia / esperado) * 100) : 0;
      let riesgoAth = 'Sin riesgo';
      if (porcentajeEfec < 60) riesgoAth = 'Riesgo alto';
      else if (porcentajeEfec < 85) riesgoAth = 'Riesgo medio';
      // Días - calcular asistencias reales por día (excluyendo domingos)
      const asistencias = Array(31).fill(0); // Inicializar con 0
      if (asisMap[key]) {
        // Función para obtener siguiente fecha excluyendo domingos
        const nextDate = (iso) => {
          const [y,m,d] = iso.split("-").map(Number);
          const dt = new Date(y, m-1, d);
          do { dt.setDate(dt.getDate()+1); } while (dt.getDay()===0);
          return dt.toISOString().slice(0,10);
        };
        
        // Calcular fechas consecutivas sin domingos
        let fechasConsecutivas = [lote.FechaInicio.toISOString().slice(0,10)];
        for (let i = 1; i < 31; i++) {
          fechasConsecutivas.push(nextDate(fechasConsecutivas[i-1]));
        }
        
        // Para cada día consecutivo, contar cuántos tienen asistencia 'A'
        for (let dia = 0; dia < 31; dia++) {
          const fechaStr = fechasConsecutivas[dia];
          if (asisMap[key][fechaStr]) {
            // Contar cuántos tienen asistencia 'A' en este día
            asistencias[dia] = asisMap[key][fechaStr].filter(estado => estado === 'A').length;
          }
        }
        
        // Debug: Mostrar las asistencias encontradas para este lote
        console.log(`DEBUG ${lote.NombreCampaña} - Key: ${key}`);
        console.log(`DEBUG ${lote.NombreCampaña} - Fechas con asistencias:`, Object.keys(asisMap[key] || {}));
        console.log(`DEBUG ${lote.NombreCampaña} - Primeros 7 días de asistencias:`, asistencias.slice(0, 7));
        
        // Debug específico para Josep - asistencias
        if (lote.DNI_Capacitador === '75707924') {
          console.log(`DEBUG JOSEP - Asistencias calculadas:`, asistencias.slice(0, 7));
          console.log(`DEBUG JOSEP - Fechas consecutivas:`, fechasConsecutivas.slice(0, 7));
        }
      }
      // Activos = lista - bajas
      const qBajas = bajasMap[key] || 0;
      const activos = lista - qBajas;
      
      // Nueva fórmula: % Deserción = (Bajas día 3+) / (Postulantes con asistencia en día 2 laborable)
      let postulantesDia2 = 0;
      
      // Calcular día 2 laborable (excluyendo domingos)
      let dia2Laborable = new Date(lote.FechaInicio);
      
      // Avanzar al día 2 laborable (excluyendo domingos)
      let diasAvanzados = 0;
      while (diasAvanzados < 2) {
        dia2Laborable.setDate(dia2Laborable.getDate() + 1);
        if (dia2Laborable.getDay() !== 0) { // No es domingo
          diasAvanzados++;
        }
      }
      
      const dia2Fecha = dia2Laborable.toISOString().slice(0,10);
      
      // Contar postulantes con asistencia registrada en el día 2 laborable
      if (asisMap[key] && asisMap[key][dia2Fecha]) {
        // Contar postulantes con estados A, F, J, T (asistencias normales)
        postulantesDia2 = asisMap[key][dia2Fecha].filter(estado => 
          estado === 'A' || estado === 'F' || estado === 'J' || estado === 'T'
        ).length;
      }
      
      // Calcular porcentaje de deserción con nueva fórmula
      const porcentajeDeser = postulantesDia2 > 0 ? Math.round((qBajas / postulantesDia2) * 100) : 0;
      
      // Debug: Log para verificar los valores
      console.log(`DEBUG ${lote.NombreCampaña}: lista=${lista}, qBajas=${qBajas}, activos=${activos}, primerDia=${primerDia}, porcentajeDeser=${porcentajeDeser}%`);
      console.log(`DEBUG ${lote.NombreCampaña}: Nueva fórmula - dia2Fecha=${dia2Fecha}, postulantesDia2=${postulantesDia2}, qBajas=${qBajas}, porcentajeDeser=${porcentajeDeser}%`);
      // Calcular fecha fin OJT basada en la duración de la campaña (excluyendo domingos)
      const duracion = obtenerDuracion(lote.NombreCampaña);
      const fechaInicio = new Date(lote.FechaInicio);
      
      // Función para obtener siguiente fecha excluyendo domingos
      const nextDate = (iso) => {
        const [y,m,d] = iso.split("-").map(Number);
        const dt = new Date(y, m-1, d);
        do { dt.setDate(dt.getDate()+1); } while (dt.getDay()===0);
        return dt.toISOString().slice(0,10);
      };
      
      // Calcular fecha fin OJT excluyendo domingos
      let fechaFinOJT = new Date(fechaInicio);
      const totalDias = duracion.cap + duracion.ojt - 1; // -1 porque el primer día cuenta
      
      // Avanzar día por día excluyendo domingos
      for (let i = 0; i < totalDias; i++) {
        const fechaStr = fechaFinOJT.toISOString().slice(0,10);
        fechaFinOJT = new Date(nextDate(fechaStr));
      }
      
      // Determinar si está finalizada (fecha actual > fecha fin OJT)
      const fechaActual = new Date();
      const finalizado = fechaActual > fechaFinOJT;
      
      return {
        id: key,
        campania: lote.NombreCampaña,
        modalidad: lote.NombreModalidad,
        formador: lote.formador,
        inicioCapa: lote.FechaInicio.toISOString().slice(0,10),
        finOjt: fechaFinOJT.toISOString().slice(0,10),
        finalizado,
        qEntre,
        lista,
        primerDia,
        asistencias,
        activos,
        qBajas,
        porcentajeDeser,
        riesgoForm: riesgoAth // Puedes ajustar si tienes otra lógica
      };
    });

    // Aplicar filtro de estado si está presente
    if (estado) {
      allRows = allRows.filter(row => {
        if (estado === 'En curso') {
          return !row.finalizado;
        } else if (estado === 'Finalizado') {
          return row.finalizado;
        }
        return true;
      });
    }
    
    // Ordenar por fechaInicio descendente
    allRows.sort((a, b) => new Date(b.inicioCapa) - new Date(a.inicioCapa));
    
    // Paginación
    const paginated = allRows.slice((page - 1) * pageSize, page * pageSize);
    res.json({
      data: paginated,
      total: allRows.length,
      page,
      pageSize
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener resumen de capacitaciones' });
  }
});

// Endpoint para obtener opciones de filtros
router.get('/capacitaciones/opciones-filtros', async (req, res) => {
  try {
    // Obtener campañas únicas
    const campanias = await R().query(`
      SELECT DISTINCT c.NombreCampaña
      FROM Postulantes_En_Formacion pf
      LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
      WHERE pf.FechaInicio IS NOT NULL
      ORDER BY c.NombreCampaña
    `);
    
    // Obtener formadores únicos
    const formadores = await R().query(`
      SELECT DISTINCT e.Nombres + ' ' + e.ApellidoPaterno + ' ' + e.ApellidoMaterno AS formador
      FROM Postulantes_En_Formacion pf
      LEFT JOIN PRI.Empleados e ON pf.DNI_Capacitador = e.DNI
      WHERE pf.FechaInicio IS NOT NULL
      ORDER BY formador
    `);
    
    res.json({
      campanias: campanias.recordset.map(c => c.NombreCampaña),
      formadores: formadores.recordset.map(f => f.formador)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener opciones de filtros' });
  }
});

// Obtener todos los Q ENTRE registrados
router.get('/qentre-jefe', async (req, res) => {
  try {
    const { recordset } = await R().query(`
      SELECT CampañaID, FechaInicio, DNI_Capacitador, qEntre
      FROM QEntre_Jefe
    `);
    res.json(recordset);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar Q ENTRE' });
  }
});

// Guardar o actualizar Q ENTRE para una capacitación
router.post('/qentre-jefe', async (req, res) => {
  console.log('POST /qentre-jefe - Body recibido:', req.body);
  const { CampañaID, FechaInicio, DNI_Capacitador, qEntre } = req.body;
  console.log('POST /qentre-jefe - Datos extraídos:', { CampañaID, FechaInicio, DNI_Capacitador, qEntre });
  
  if (!CampañaID || !FechaInicio || !DNI_Capacitador || qEntre == null) {
    console.log('POST /qentre-jefe - Error: Faltan datos requeridos');
    return res.status(400).json({ error: 'Faltan datos requeridos', received: req.body });
  }
  try {
    await R()
      .input('CampañaID', sql.Int, CampañaID)
      .input('FechaInicio', sql.Date, FechaInicio)
      .input('DNI_Capacitador', sql.VarChar(20), DNI_Capacitador)
      .input('qEntre', sql.Int, qEntre)
      .query(`
        MERGE QEntre_Jefe AS target
        USING (SELECT @CampañaID AS CampañaID, @FechaInicio AS FechaInicio, @DNI_Capacitador AS DNI_Capacitador) AS source
        ON (target.CampañaID = source.CampañaID AND target.FechaInicio = source.FechaInicio AND target.DNI_Capacitador = source.DNI_Capacitador)
        WHEN MATCHED THEN
          UPDATE SET qEntre = @qEntre, fechaActualizacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (CampañaID, FechaInicio, DNI_Capacitador, qEntre)
          VALUES (@CampañaID, @FechaInicio, @DNI_Capacitador, @qEntre);
      `);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar Q ENTRE' });
  }
});

// Capas disponibles para la coordinadora
router.get('/dashboard-coordinadora/:dni/capas', async (req, res) => {
  const dniCoordinadora = req.params.dni;
  const { campania } = req.query;
  
  console.log('🔍 DEBUG - Endpoint capas llamado con:');
  console.log('  - dniCoordinadora:', dniCoordinadora);
  console.log('  - campania recibida:', campania);
  console.log('  - tipo de campania:', typeof campania);
  
  try {
    let query = `
      SELECT DISTINCT 
        pf.CampañaID,
        c.NombreCampaña,
        pf.FechaInicio,
        ROW_NUMBER() OVER (PARTITION BY pf.CampañaID ORDER BY pf.FechaInicio DESC) AS capa
      FROM Postulantes_En_Formacion pf
      LEFT JOIN PRI.Campanias c ON pf.CampañaID = c.CampañaID
      WHERE pf.DNI_Capacitador IN (
        SELECT DNI FROM PRI.Empleados WHERE CargoID = 7 AND EstadoEmpleado = 'Activo' AND JefeDNI = @jefeDni
      )
    `;
    
    if (campania) {
      query += ` AND pf.CampañaID = @campania`;
      console.log('  - Filtro de campaña aplicado:', campania);
    } else {
      console.log('  - No se aplicó filtro de campaña');
    }
    
    query += ` GROUP BY pf.CampañaID, c.NombreCampaña, pf.FechaInicio ORDER BY pf.CampañaID, pf.FechaInicio DESC`;
    
    console.log('  - Query final:', query);
    
    const { recordset } = await R()
      .input('jefeDni', sql.VarChar(20), dniCoordinadora)
      .input('campania', sql.VarChar(100), campania || null)
      .query(query);
    
    console.log('  - Resultados obtenidos:', recordset.length, 'registros');
    console.log('  - Primeros 3 registros:', recordset.slice(0, 3));
    
    res.json(recordset.map(r => ({
      capa: r.capa,
      fechaInicio: r.FechaInicio.toISOString().slice(0, 10),
      campaniaId: r.CampañaID,
      campaniaNombre: r.NombreCampaña || `Campaña ${r.CampañaID}`
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener capas', details: e.message });
  }
});

module.exports = router;
