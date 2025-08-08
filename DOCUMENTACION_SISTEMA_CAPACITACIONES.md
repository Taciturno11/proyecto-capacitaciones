# 📋 DOCUMENTACIÓN COMPLETA - SISTEMA DE CAPACITACIONES

## 🏗️ **ARQUITECTURA DEL PROYECTO**

### **Frontend (React + Vite + Tailwind)**
- **Ubicación:** `CAPACITACION_FRONT/`
- **Tecnologías:** React, Vite, Tailwind CSS
- **Componente principal:** `AsistenciasTable.jsx`
- **Hook principal:** `usePostulantes.js`
- **Estilo:** Moderno, profesional, solo Tailwind CSS

### **Backend (Node.js + Express + MSSQL)**
- **Ubicación:** `CAPACITACIONES_BACK/`
- **Tecnologías:** Node.js, Express, MSSQL
- **Archivo principal:** `server.js`
- **Rutas:** `routers/api.js`
- **Base de datos:** SQL Server (Partner)

---

## 🔄 **FLUJO PRINCIPAL DEL SISTEMA**

### **1. Carga de Datos**
```javascript
// Frontend: usePostulantes.js - loadLote()
const { postulantes, asistencias, duracion } = await api(
  `/api/postulantes?dniCap=${dniCap}&campaniaID=${CampañaID}&mes=${mes}&fechaInicio=${fechaInicio}`
);
```

### **2. Estados de Asistencia**
- **"A"** = Asistencia
- **"F"** = Falta
- **"J"** = Justificada
- **"T"** = Tardanza
- **"Deserción"** = Deserción (se convierte a "D" en BD)

### **3. Estados de Postulante**
- **"Capacitacion"** = En capacitación
- **"Desertó"** = Desertó
- **"Contratado"** = Contratado
- **"Desaprobado"** = Desaprobado

---

## 🎯 **FUNCIONALIDAD DE DESERCIONES**

### **Registrar Deserción:**
1. **Frontend:** Usuario selecciona "Deserción" → Se abre popover para motivo
2. **Frontend:** Se guarda en estado local `deserciones`
3. **Backend:** `POST /deserciones/bulk` → Inserta en `Deserciones_Formacion`
4. **Backend:** `UPDATE Postulantes_En_Formacion SET EstadoPostulante = 'Desertó'`

### **Cancelar Deserción (D → A, F, J, T):**
1. **Frontend:** Usuario cambia "Deserción" → "A"
2. **Frontend:** `setAsistencia()` → Actualiza `resultadoFinal = "Capacitacion"`
3. **Backend:** `POST /asistencia/bulk` → 
   - Elimina de `Deserciones_Formacion`
   - Actualiza asistencia en `Asistencia_Formacion`
   - `UPDATE Postulantes_En_Formacion SET EstadoPostulante = 'Capacitacion'`

---

## 🔧 **CORRECCIONES CRÍTICAS APLICADAS**

### **1. Backend - EstadoPostulante**
**Archivo:** `CAPACITACIONES_BACK/routers/api.js`
**Línea:** 534
```sql
-- ANTES (incorrecto):
EstadoPostulante = 'En Formación'

-- DESPUÉS (correcto):
EstadoPostulante = 'Capacitacion'
```

### **2. Frontend - Actualización Automática**
**Archivo:** `CAPACITACION_FRONT/src/hooks/usePostulantes.js`
**Líneas:** 130-140
```javascript
// Verificar si estaba en deserción y ahora cambia a asistencia normal
const estabaEnDesercion = copy[row].asistencia[col] === "Deserción";
const cambiaAAistenciaNormal = val !== "Deserción" && val !== "---" && val !== "";

// Si cambia de deserción a asistencia normal, actualizar resultadoFinal
if (estabaEnDesercion && cambiaAAistenciaNormal) {
  copy[row].resultadoFinal = "Capacitacion";
}
```

### **3. Frontend - Evitar Petición Conflictiva**
**Archivo:** `CAPACITACION_FRONT/src/hooks/usePostulantes.js`
**Líneas:** 235-245
```javascript
// Si el postulante tenía deserción y ahora tiene asistencia normal, 
// no enviar el estado "Desertó" porque ya se actualizó en el backend
const tieneDesercionCancelada = p.asistencia.some(est => est === "Deserción") === false && 
                              p.asistencia.some(est => est === "A" || est === "F" || est === "J" || est === "T") === true;

if (tieneDesercionCancelada && p.resultadoFinal === "Desertó") {
  // No enviar este estado porque ya se actualizó en el backend
  return null;
}
```

---

## 🚨 **PROBLEMAS CONOCIDOS Y SOLUCIONES**

### **Problema 1: CampañaID undefined**
**Síntoma:** MERGE no encuentra registros correctos
**Solución:** Asegurar que `CampañaID` nunca sea undefined
```javascript
const campaniaID = params.campaniaID || p.CampañaID;
```

### **Problema 2: EstadoPostulante no se actualiza**
**Síntoma:** Cambia de "Desertó" a "Capacitacion" pero vuelve a "Desertó"
**Causa:** Petición conflictiva de `/postulantes/estado`
**Solución:** Evitar enviar petición cuando se cancela deserción

### **Problema 3: Timing en actualizaciones**
**Síntoma:** `setAsistencia` es asíncrono pero `guardarCambios` se ejecuta inmediatamente
**Solución:** Lógica de detección de deserciones canceladas

### **Problema 4: Inconsistencia de nombres de parámetros**
**Síntoma:** `[usePostulantes] No se carga lote por parámetros inválidos: CampañaID: undefined`
**Causa:** Inconsistencia entre mayúsculas/minúsculas en nombres de parámetros
**Solución:** Asegurar consistencia en nombres de parámetros
```javascript
// ❌ INCORRECTO:
await loadLote({ dniCap: params.dniCap, CampañaID: params.campaniaID, ... });

// ✅ CORRECTO:
await loadLote({ dniCap: params.dniCap, CampañaID: params.CampañaID, ... });
```

### **Problema 5: Errores de recarga después de guardar**
**Síntoma:** Guardado exitoso pero error en recarga posterior
**Causa:** Parámetros incorrectos en `loadLote` después de `guardarCambios`
**Solución:** Verificar que los parámetros se pasen correctamente
```javascript
// En guardarCambios, línea 314:
await loadLote({ 
  dniCap: params.dniCap, 
  CampañaID: params.CampañaID,  // ← Usar mayúscula consistente
  mes: params.mes, 
  fechaInicio: params.fechaInicio, 
  capaNum: params.capaNum, 
  horariosBase: params.horariosBase 
});
```

### **Problema 6: Dashboard del jefe - Q BAJAS incorrecto**
**Síntoma:** Discrepancia entre deserciones en tabla de asistencias y dashboard del jefe
**Causa:** JOIN incorrecto que contaba deserciones de todas las campañas del mismo DNI
**Solución:** Agregar condiciones de campaña en el JOIN
```sql
-- ANTES (incorrecto):
JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni

-- DESPUÉS (correcto):
JOIN Postulantes_En_Formacion p ON p.DNI = d.postulante_dni 
  AND p.CampañaID = d.CampañaID
  AND p.FechaInicio = d.fecha_inicio
```

### **Problema 7: Dashboard del jefe - FECHA FIN OJT incorrecta**
**Síntoma:** Fecha fin OJT no coincide con días laborables
**Causa:** Cálculo usando días de calendario sin excluir domingos
**Solución:** Implementar cálculo de días laborables
```javascript
// ANTES (incorrecto):
fechaFinOJT.setDate(fechaInicio.getDate() + duracion.cap + duracion.ojt - 1);

// DESPUÉS (correcto):
// Avanzar día por día excluyendo domingos
for (let i = 0; i < totalDias; i++) {
  const fechaStr = fechaFinOJT.toISOString().slice(0,10);
  fechaFinOJT = new Date(nextDate(fechaStr));
}
```

### **Problema 8: Dashboard del jefe - Q BAJAS con días laborables**
**Síntoma:** Conteo de deserciones no coincide con tabla de asistencias
**Causa:** Uso de DATEDIFF (días de calendario) en lugar de días laborables
**Solución:** Implementar cálculo de días laborables para filtrar deserciones
```javascript
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
```

### **Problema 9: Dashboard del jefe - Filtros y paginación**
**Síntoma:** Al filtrar por campaña o formador, no muestra los primeros 10 registros
**Causa:** Filtros aplicados localmente después de recibir datos paginados del backend
**Solución:** Enviar filtros al backend y reiniciar paginación
```javascript
// Frontend: Enviar filtros al backend
const params = new URLSearchParams({
  page: page.toString(),
  pageSize: PAGE_SIZE.toString()
});

if (filtroCampania) params.append('campania', filtroCampania);
if (filtroFormador) params.append('formador', filtroFormador);
if (filtroEstado) params.append('estado', filtroEstado);

// Reiniciar página al cambiar filtros
onChange={(e) => {
  setFiltroCampania(e.target.value);
  setPage(1); // Reiniciar a la primera página
}}
```

### **Problema 10: Dashboard del jefe - JOIN incompleto en asistencias**
**Síntoma:** Capacitador específico (Josep 75707924) no muestra asistencias en columnas de días
**Causa:** JOIN en consulta de asistencias no incluía condición de CampañaID
**Solución:** Agregar condición de campaña al JOIN
```sql
-- ANTES (incorrecto):
JOIN Postulantes_En_Formacion p ON a.postulante_dni = p.DNI 
  AND a.fecha_inicio = p.FechaInicio

-- DESPUÉS (correcto):
JOIN Postulantes_En_Formacion p ON a.postulante_dni = p.DNI 
  AND a.fecha_inicio = p.FechaInicio
  AND a.CampañaID = p.CampañaID
```

### **Problema 11: Dashboard del jefe - Caso especial sin asistencias normales**
**Síntoma:** Capacitador Josep (75707924) en Hogar 2025-07-02 muestra 0 en "1er DÍA" y días vacíos
**Causa:** Solo existen deserciones (D) en la base de datos, no asistencias normales (A, F, J, T)
**Solución:** Verificar datos y agregar asistencias normales si es necesario
```sql
-- Consulta para verificar asistencias normales
SELECT 
    a.postulante_dni,
    a.fecha,
    a.estado_asistencia,
    p.Nombres + ' ' + p.ApellidoPaterno + ' ' + p.ApellidoMaterno AS NombrePostulante
FROM Asistencia_Formacion a
JOIN Postulantes_En_Formacion p ON a.postulante_dni = p.DNI 
    AND a.fecha_inicio = p.FechaInicio
    AND a.CampañaID = p.CampañaID
WHERE p.DNI_Capacitador = '75707924'
    AND p.CampañaID = 15  -- Hogar
    AND p.FechaInicio = '2025-07-02'
    AND a.estado_asistencia IN ('A', 'F', 'J', 'T')  -- Solo asistencias normales
ORDER BY a.fecha, a.postulante_dni;
```

### **Problema 12: Dashboard del jefe - Nueva fórmula para % DESERCIÓN**
**Síntoma:** Fórmula actual no refleja la deserción real de postulantes activos
**Causa:** Fórmula anterior usaba `Q BAJAS / LISTA` (todas las deserciones / todos los postulantes)
**Solución:** Implementar nueva fórmula más precisa
```javascript
// NUEVA FÓRMULA: % DESERCIÓN = (Bajas día 3+) / (Postulantes con asistencia en día 2 laborable)

// Calcular día 2 laborable (excluyendo domingos)
let dia2Laborable = new Date(lote.FechaInicio);
let diasAvanzados = 0;
while (diasAvanzados < 2) {
  dia2Laborable.setDate(dia2Laborable.getDate() + 1);
  if (dia2Laborable.getDay() !== 0) { // No es domingo
    diasAvanzados++;
  }
}

const dia2Fecha = dia2Laborable.toISOString().slice(0,10);

// Contar postulantes con asistencia registrada en el día 2 laborable
let postulantesDia2 = 0;
if (asisMap[key] && asisMap[key][dia2Fecha]) {
  // Contar postulantes con estados A, F, J, T (asistencias normales)
  postulantesDia2 = asisMap[key][dia2Fecha].filter(estado => 
    estado === 'A' || estado === 'F' || estado === 'J' || estado === 'T'
  ).length;
}

// Calcular porcentaje de deserción con nueva fórmula
const porcentajeDeser = postulantesDia2 > 0 ? Math.round((qBajas / postulantesDia2) * 100) : 0;
```

**Lógica de la nueva fórmula:**
- **Numerador:** `qBajas` (deserciones del día 3 laborable en adelante - ya calculado)
- **Denominador:** `postulantesDia2` (postulantes con asistencia en día 2 laborable)
- **Estados válidos:** A, F, J, T (asistencias normales)
- **Excluye:** Estados D (deserción) y vacíos
- **Días laborables:** Excluye domingos automáticamente

---

## 📊 **ESTRUCTURA DE BASE DE DATOS**

### **Tablas Principales:**
- **`Postulantes_En_Formacion`** - Estado general del postulante
- **`Asistencia_Formacion`** - Asistencias diarias
- **`Deserciones_Formacion`** - Registro de deserciones
- **`Evaluaciones_Formacion`** - Notas de evaluaciones

### **Campos Críticos:**
- **`EstadoPostulante`** - "Capacitacion", "Desertó", "Contratado", "Desaprobado"
- **`estado_asistencia`** - "A", "F", "J", "T", "D"
- **`CampañaID`** - Identificador de campaña
- **`fecha_inicio`** - Fecha de inicio de capacitación

---

## 🎯 **ENDPOINTS CRÍTICOS**

### **POST /asistencia/bulk**
- **Función:** Guardar asistencias y cancelar deserciones
- **Lógica:** Si `estado_asistencia !== 'D'`, elimina deserción y actualiza estado

### **POST /deserciones/bulk**
- **Función:** Registrar deserciones
- **Lógica:** Inserta en `Deserciones_Formacion` y actualiza `EstadoPostulante = 'Desertó'`

### **POST /postulantes/estado**
- **Función:** Actualizar estado final del postulante
- **Nota:** Se evita enviar cuando se cancela deserción

## 📊 **DASHBOARD DEL JEFE**

### **GET /capacitaciones/resumen-jefe**
- **Función:** Obtener resumen de capacitaciones para el jefe
- **Paginación:** 10 registros por página
- **Filtros:** Campaña, Formador, Estado
- **Componente:** `ResumenCapacitacionesJefeTable.jsx`

### **Columnas del Dashboard:**
- **CAMPAÑA:** Nombre de la campaña
- **MODALIDAD:** Presencial/Remoto
- **FORMADOR:** Nombre del capacitador
- **INICIO CAPA:** Fecha de inicio de la capa
- **FECHA FIN OJT:** Último día de OJT (excluyendo domingos)
- **STATUS:** En curso/Finalizado
- **Q ENTRE:** Cantidad esperada (editable)
- **ESPERADO:** Q ENTRE * 2
- **LISTA:** Total de postulantes
- **1er DÍA:** Asistencias del primer día
- **% EFEC ATH:** Porcentaje de efectividad
- **RIESGO ATH:** Riesgo basado en % EFEC ATH
- **Días 1-7:** Asistencias por día (scroll horizontal)
- **ACTIVOS:** LISTA - Q BAJAS
- **Q BAJAS:** Deserciones del día 3 laborable en adelante
- **% DESER:** Porcentaje de deserciones
- **RIESGO FORM:** Riesgo de formación

### **Lógica de Cálculos:**
- **FECHA FIN OJT:** Calculada excluyendo domingos
- **Q BAJAS:** Solo deserciones del día 3 laborable en adelante
- **% DESERCIÓN:** Nueva fórmula = (Q BAJAS) / (Postulantes con asistencia en día 2 laborable)
- **Días laborables:** Excluyen domingos automáticamente
- **Filtrado por campaña:** Cada campaña es independiente

### **Nueva Fórmula de % DESERCIÓN:**
**Fórmula anterior:** `Q BAJAS / LISTA` (todas las deserciones / todos los postulantes)
**Fórmula nueva:** `Q BAJAS / Postulantes día 2` (deserciones día 3+ / postulantes activos día 2)

**Ventajas de la nueva fórmula:**
- ✅ **Más precisa:** Solo considera postulantes que realmente participaron
- ✅ **Mejor indicador:** Mide deserción de la población activa
- ✅ **Excluye:** Postulantes que nunca asistieron o desertaron antes del día 2
- ✅ **Consistente:** Usa días laborables en todo el cálculo

### **Caso Especial Documentado: Josep (75707924)**
**Contexto:** Capacitador Josep en campaña Hogar 2025-07-02 presentaba columnas de días vacías
**Diagnóstico:** 
1. JOIN incompleto en consulta de asistencias (faltaba `AND a.CampañaID = p.CampañaID`)
2. Solo existían deserciones (D) en la base de datos, no asistencias normales (A, F, J, T)
**Solución aplicada:**
1. Corregir JOIN en consulta de asistencias
2. Agregar manualmente asistencias normales a la base de datos
**Resultado:** Dashboard muestra correctamente todos los datos

---

## 🔍 **LOGS DE DEPURACIÓN**

### **Backend - Logs Importantes:**
```
=== INICIO GUARDAR ASISTENCIAS ===
=== ELIMINANDO DESERCIÓN ===
=== RESULTADO ELIMINACIÓN ===
Filas afectadas: [ 1, 1 ]
```

### **Frontend - Logs Importantes:**
```
Estados finales a enviar: [...]
Deserciones canceladas: [...]
```

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

1. **Múltiples deserciones:** Se permiten para el mismo DNI en diferentes campañas
2. **CampañaID:** Siempre debe estar presente para evitar registros duplicados
3. **Timing:** Las actualizaciones de estado son asíncronas
4. **Vista:** Se recarga automáticamente después de guardar cambios
5. **Estilo:** Solo Tailwind CSS, sin CSS inline

## 🔧 **MEJORES PRÁCTICAS PARA EVITAR PROBLEMAS**

### **1. Consistencia en Nombres de Parámetros**
```javascript
// ✅ SIEMPRE usar mayúscula para CampañaID:
const CampañaID = params.CampañaID || p.CampañaID;

// ❌ EVITAR inconsistencias:
const campaniaID = params.campaniaID; // minúscula
```

### **2. Validación de Parámetros**
```javascript
// ✅ Validar antes de usar:
if (!dniCap || !CampañaID || !mes || !fechaInicio || !capaNum) {
  console.warn('[usePostulantes] No se carga lote por parámetros inválidos:', { dniCap, CampañaID, mes, fechaInicio, capaNum });
  return;
}
```

### **3. Logs de Depuración**
```javascript
// ✅ Agregar logs para debugging:
console.log("Params recibidos:", params);
console.log("CampañaID en params:", params.CampañaID);
```

### **4. Manejo de Estados Asíncronos**
```javascript
// ✅ Esperar a que se actualice el estado antes de continuar:
await setAsistencia(row, col, val);
await guardarCambios(params);
```

### **5. Verificación de Recarga**
```javascript
// ✅ Verificar que loadLote reciba los parámetros correctos:
await loadLote({ 
  dniCap: params.dniCap, 
  CampañaID: params.CampañaID,  // ← Consistencia
  mes: params.mes, 
  fechaInicio: params.fechaInicio, 
  capaNum: params.capaNum 
});
```

---

## 🚀 **COMANDOS DE DESARROLLO**

### **Frontend:**
```bash
cd CAPACITACION_FRONT
npm run dev
```

### **Backend:**
```bash
cd CAPACITACIONES_BACK
npm run dev
```

---

## 📝 **NOTAS PARA FUTURAS CONSULTAS**

- **Contexto completo:** Este documento contiene toda la información necesaria
- **Correcciones aplicadas:** Todas las correcciones críticas están documentadas
- **Flujo de deserciones:** El manejo de deserciones es el punto más complejo
- **Timing:** Los problemas de timing son comunes en este sistema
- **Base de datos:** SQL Server con tablas específicas para capacitaciones
- **Dashboard del jefe:** Usa días laborables (excluye domingos) para todos los cálculos
- **Consistencia:** Dashboard y tabla de asistencias deben mostrar los mismos datos
- **Diagnóstico de datos:** Antes de modificar código, verificar si el problema es de datos o de lógica
- **JOINs completos:** Siempre incluir todas las condiciones necesarias en los JOINs
- **Fórmulas de dashboard:** % DESERCIÓN usa nueva fórmula con postulantes activos del día 2

## 🔍 **CHECKLIST DE DEBUGGING**

### **Cuando hay errores en consola:**
- [ ] **Verificar nombres de parámetros** (mayúsculas/minúsculas)
- [ ] **Revisar logs de depuración** en `guardarCambios`
- [ ] **Comprobar que `CampañaID` no sea undefined**
- [ ] **Verificar timing** entre actualizaciones de estado
- [ ] **Revisar peticiones conflictivas** a `/postulantes/estado`

### **Cuando el EstadoPostulante no se actualiza:**
- [ ] **Verificar que se ejecute la eliminación de deserción**
- [ ] **Comprobar que no se envíe petición conflictiva**
- [ ] **Revisar logs de backend** para confirmar UPDATE
- [ ] **Verificar que `resultadoFinal` se actualice en frontend**

### **Cuando hay problemas de recarga:**
- [ ] **Verificar parámetros en `loadLote`**
- [ ] **Comprobar consistencia de nombres**
- [ ] **Revisar que todos los parámetros estén presentes**
- [ ] **Verificar logs de `usePostulantes`**

## 🚨 **ERRORES COMUNES Y SUS SOLUCIONES**

| Error | Causa | Solución |
|-------|-------|----------|
| `CampañaID: undefined` | Inconsistencia de nombres | Usar `params.CampañaID` (mayúscula) |
| `EstadoPostulante` no cambia | Petición conflictiva | Evitar enviar `/postulantes/estado` |
| Recarga falla después de guardar | Parámetros incorrectos | Verificar `loadLote` en `guardarCambios` |
| MERGE no encuentra registros | `CampañaID` undefined | Asegurar que siempre tenga valor |
| Timing issues | Estados asíncronos | Esperar actualizaciones antes de continuar |
| Dashboard Q BAJAS incorrecto | JOIN sin filtro de campaña | Agregar condiciones de campaña en JOIN |
| FECHA FIN OJT incorrecta | Días de calendario | Usar cálculo de días laborables |
| Conteo deserciones discrepante | DATEDIFF vs días laborables | Implementar cálculo de días laborables |
| Filtros no muestran primeros 10 registros | Filtros aplicados localmente | Enviar filtros al backend |
| Columnas de días vacías | JOIN incompleto en asistencias | Agregar `AND a.CampañaID = p.CampañaID` |
| Solo deserciones, no asistencias normales | Datos faltantes en BD | Verificar y agregar asistencias normales |
| % DESERCIÓN no refleja realidad | Fórmula usa LISTA total | Usar postulantes con asistencia en día 2 |

---

**✅ Esta documentación contiene todo el contexto necesario para resolver problemas futuros sin necesidad de análisis previo.** 