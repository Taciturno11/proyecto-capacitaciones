/* backend/routes/api.js
   --------------------------------------------------------------
   Todas las rutas separadas; usa la conexión global de mssql.
*/
const { Router } = require("express");
const sql        = require("mssql");
const router     = Router();
const jwt = require('jsonwebtoken');
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
  "Portabilidad PPA"  : { cap:5 , ojt:5 }
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
    'migración': 'Migracion'
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
    console.log(`[DURACION] Búsqueda directa exitosa: "${campania}"`);
    return DURACION[campania];
  }
  
  // Si no encuentra, normalizar y buscar
  const campaniaNormalizada = normalizarCampania(campania);
  const resultado = DURACION[campaniaNormalizada] || { cap:5, ojt:5 };
  
  if (campaniaNormalizada !== campania) {
    console.log(`[DURACION] Normalización aplicada: "${campania}" → "${campaniaNormalizada}" → ${JSON.stringify(resultado)}`);
  } else {
    console.log(`[DURACION] No se encontró duración para: "${campania}" → usando fallback ${JSON.stringify(resultado)}`);
  }
  
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
               (SELECT DISTINCT Campaña
                FROM Postulantes_En_Formacion
                WHERE DNI_Capacitador = e.DNI FOR JSON PATH) AS campañasJson
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
      campañas: JSON.parse(row.campañasJson || "[]").map(o => o.Campaña)
    });
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ───────────────────── Lotes / capas ─────────────────────── */
router.get("/capas", async (req, res) => {
  const { dniCap, campania, mes } = req.query;      // mes = YYYY-MM
  console.log("[GET /capas] Parámetros recibidos:", { dniCap, campania, mes });
  try {
    let query = `
      SELECT ROW_NUMBER() OVER (ORDER BY MIN(FechaInicio)) AS capa,
             FORMAT(MIN(FechaInicio),'yyyy-MM-dd') AS fechaInicio,
             Campaña as campania
      FROM Postulantes_En_Formacion
      WHERE DNI_Capacitador = @dniCap
    `;
    if (campania) query += ` AND Campaña = @camp`;
    if (mes)      query += ` AND FORMAT(FechaInicio,'yyyy-MM') = @prefijo`;
    query += ` GROUP BY FORMAT(FechaInicio,'yyyy-MM-dd'), Campaña ORDER BY fechaInicio`;

    const request = R().input("dniCap", sql.VarChar(20), dniCap);
    if (campania) request.input("camp", sql.VarChar(100), campania);
    if (mes)      request.input("prefijo", sql.VarChar(7), mes);

    const { recordset } = await request.query(query);
    console.log("[GET /capas] Resultado SQL:", recordset);
    res.json(recordset);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ─────────────── Postulantes + asistencias ───────────────── */
router.get('/postulantes', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni; // El DNI del capacitador autenticado
  const { campania, mes, fechaInicio } = req.query;
  try {
    const post = await R()
      .input("dniCap",   sql.VarChar(20),  dniCap)
      .input("camp",     sql.VarChar(100), campania)
      .input("prefijo",  sql.VarChar(7),   mes)
      .input("fechaIni", sql.VarChar(10),  fechaInicio)
      .query(`
        SELECT DNI AS dni,
               CONCAT(Nombres,' ',ApellidoPaterno,' ',ApellidoMaterno) AS nombre,
               Telefono AS telefono
        FROM Postulantes_En_Formacion
        WHERE DNI_Capacitador       = @dniCap
          AND Campaña               = @camp
          AND FORMAT(FechaInicio,'yyyy-MM')   = @prefijo
          AND FORMAT(FechaInicio,'yyyy-MM-dd')= @fechaIni
      `);

    const asis = await R()
      .input("dniCap",   sql.VarChar(20),  dniCap)
      .input("camp",     sql.VarChar(100), campania)
      .input("prefijo",  sql.VarChar(7),   mes)
      .input("fechaIni", sql.VarChar(10),  fechaInicio)
      .query(`
        SELECT a.postulante_dni,
               CONVERT(char(10), a.fecha, 23) AS fecha,
               a.estado_asistencia
        FROM Asistencia_Formacion a
        JOIN Postulantes_En_Formacion p ON p.DNI = a.postulante_dni
        WHERE p.DNI_Capacitador       = @dniCap
          AND p.Campaña               = @camp
          AND FORMAT(a.fecha,'yyyy-MM')       = @prefijo
          AND FORMAT(p.FechaInicio,'yyyy-MM-dd') = @fechaIni
      `);

    res.json({
      postulantes : post.recordset,
      asistencias : asis.recordset,
      duracion    : obtenerDuracion(campania)
    });
  } catch (e) { console.error(e); res.sendStatus(500); }
});

/* ─────────────────── Deserciones ─────────────────────────── */
router.get('/deserciones', authMiddleware, async (req, res) => {
  const dniCap = req.user.dni;
  const { campania, mes, capa } = req.query;
  try {
    console.log('GET /deserciones params:', { dniCap, campania, mes, capa });
    const { recordset } = await R()
      .input("dniCap", sql.VarChar(20), dniCap)
      .input("camp",   sql.VarChar(100), campania)
      .input("prefijo",sql.VarChar(7),   mes)
      .input("capa",   sql.Int,          capa)
      .query(`
        SELECT d.postulante_dni,
               p.Nombres + ' ' + p.ApellidoPaterno + ' ' + p.ApellidoMaterno AS nombre,
               p.Telefono AS numero,
               FORMAT(d.fecha_desercion,'yyyy-MM-dd') AS fecha_desercion,
               d.motivo,
               d.capa_numero
        FROM Deserciones_Formacion d
        JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni
        WHERE p.DNI_Capacitador = @dniCap
          AND FORMAT(p.FechaInicio,'yyyy-MM') = @prefijo
          AND d.capa_numero = @capa
        ORDER BY d.fecha_desercion
      `);
    console.log('GET /deserciones resultado:', recordset);
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

    // Obtener todas las deserciones actuales para esos postulantes/capas
    const { recordset: desercionesActuales } = await tx.request()
      .query(`
        SELECT postulante_dni, capa_numero
        FROM Deserciones_Formacion
        WHERE postulante_dni IN (${dniList.map(d => `'${d}'`).join(',')})
          AND capa_numero IN (${capaList.join(',')})
      `);

    // Calcular cuáles deben eliminarse
    const desercionesAEliminar = desercionesActuales.filter(d =>
      !req.body.some(r => r.postulante_dni === d.postulante_dni && r.capa_numero === d.capa_numero)
    );

    // Eliminar de la BD y poner FechaCese en NULL
    for (const d of desercionesAEliminar) {
      await tx.request()
        .input("dni", sql.VarChar(20), d.postulante_dni)
        .input("capa", sql.Int, d.capa_numero)
        .query(`
          DELETE FROM Deserciones_Formacion
          WHERE postulante_dni = @dni AND capa_numero = @capa;
          UPDATE Postulantes_En_Formacion
          SET FechaCese = NULL
          WHERE DNI = @dni;
        `);
    }

    for (const r of req.body) {
      // Log de depuración detallado
      console.log("Procesando deserción:", {
        postulante_dni: r.postulante_dni,
        fecha_desercion: r.fecha_desercion,
        motivo: r.motivo,
        capa_numero: r.capa_numero,
        tipo_capa_numero: typeof r.capa_numero
      });
      
      // Si motivo es vacío, undefined o null, guardar como null; si tiene texto, guardar el texto
      let motivoSeguro = null;
      if (typeof r.motivo === 'string' && r.motivo.trim() !== '') {
        motivoSeguro = r.motivo;
      }
      // Log detallado para depuración
      console.log('Guardando deserción:', {
        dni: r.postulante_dni,
        fecha: r.fecha_desercion,
        motivo: motivoSeguro,
        capa: r.capa_numero
      });
      await tx.request()
        .input("dni",      sql.VarChar(20),   r.postulante_dni)
        .input("fechaDes", sql.Date,          r.fecha_desercion)
        .input("mot",      sql.NVarChar(250), motivoSeguro)
        .input("capa",     sql.Int,           r.capa_numero)
        .query(`
MERGE Deserciones_Formacion AS T
USING (SELECT @dni AS dni, @capa AS capa) AS S
  ON T.postulante_dni = S.dni AND T.capa_numero = S.capa
WHEN MATCHED THEN
  UPDATE SET fecha_desercion = @fechaDes, motivo = @mot
WHEN NOT MATCHED THEN
  INSERT (postulante_dni,capa_numero,fecha_desercion,motivo)
  VALUES (@dni,@capa,@fechaDes,@mot);
        `);
      // ELIMINAR ASISTENCIAS POSTERIORES A LA FECHA DE DESERCIÓN
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("fechaDes", sql.Date, r.fecha_desercion)
        .query(`
          DELETE FROM Asistencia_Formacion
          WHERE postulante_dni = @dni AND fecha > @fechaDes;
        `);
      // ACTUALIZAR FECHA DE CESE EN POSTULANTES
      await tx.request()
        .input("dni", sql.VarChar(20), r.postulante_dni)
        .input("fechaCese", sql.Date, r.fecha_desercion)
        .query(`
          UPDATE Postulantes_En_Formacion
          SET FechaCese = @fechaCese
          WHERE DNI = @dni
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
          AND p.Campaña         = @camp
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
        estado_asistencia: r.estado_asistencia
      });

      // Si el nuevo estado NO es 'D', eliminar deserción y poner FechaCese en NULL si existe
      if (r.estado_asistencia !== 'D') {
        // Buscar si existe una deserción para este postulante y capa
        // Necesitamos saber el número de capa, asumimos que viene en r.capa_numero
        // Si no viene, intentar deducirlo (puedes ajustar esto según tu modelo de datos)
        let capa_numero = r.capa_numero;
        if (typeof capa_numero === 'undefined') {
          // Buscar la capa por la fecha de inicio del postulante
          const capaRes = await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('fecha', sql.Date, r.fecha)
            .query(`
              SELECT capa_numero FROM Deserciones_Formacion
              WHERE postulante_dni = @dni
            `);
          capa_numero = capaRes.recordset[0]?.capa_numero;
        }
        if (capa_numero) {
          // Eliminar deserción y poner FechaCese en NULL si existe
          await tx.request()
            .input('dni', sql.VarChar(20), r.postulante_dni)
            .input('capa', sql.Int, capa_numero)
            .query(`
              DELETE FROM Deserciones_Formacion WHERE postulante_dni = @dni AND capa_numero = @capa;
              UPDATE Postulantes_En_Formacion SET FechaCese = NULL WHERE DNI = @dni;
            `);
        }
      }
      // Guardar la asistencia como siempre
      await tx.request()
        .input("dni",    sql.VarChar(20), r.postulante_dni)
        .input("fecha",  sql.Date,        r.fecha)
        .input("etapa",  sql.VarChar(20), r.etapa)
        .input("estado", sql.Char(1),     r.estado_asistencia)
        .query(`
MERGE Asistencia_Formacion AS T
USING (SELECT @dni AS dni, @fecha AS fecha) AS S
  ON T.postulante_dni = S.dni AND T.fecha = S.fecha
WHEN MATCHED THEN
  UPDATE SET etapa = @etapa, estado_asistencia = @estado
WHEN NOT MATCHED THEN
  INSERT (postulante_dni,fecha,etapa,estado_asistencia)
  VALUES (@dni,@fecha,@etapa,@estado);
        `);
    }
    await tx.commit();
    console.log("=== ASISTENCIAS GUARDADAS EXITOSAMENTE ===");
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

router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const result = await R()
      .input('dni', sql.VarChar(20), usuario)
      .query(`
        SELECT DNI, Nombres, ApellidoPaterno, ApellidoMaterno
        FROM PRI.Empleados
        WHERE CargoID = 7 AND DNI = @dni
      `);

    const user = result.recordset[0];
    if (!user || user.DNI !== contrasena) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { dni: user.DNI, nombre: user.Nombres },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      dni: user.DNI,
      nombres: user.Nombres,
      apellidoPaterno: user.ApellidoPaterno,
      apellidoMaterno: user.ApellidoMaterno
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

module.exports = router;
