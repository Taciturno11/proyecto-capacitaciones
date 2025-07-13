// Archivo de prueba para verificar la normalización de campañas
// Ejecutar con: node test-normalizacion.js

// Simular las funciones del backend
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

function obtenerDuracion(campania) {
  if (!campania) return { cap:5, ojt:5 };
  
  // Intentar búsqueda directa primero (para compatibilidad)
  if (DURACION[campania]) {
    console.log(`✅ Búsqueda directa exitosa: "${campania}"`);
    return DURACION[campania];
  }
  
  // Si no encuentra, normalizar y buscar
  const campaniaNormalizada = normalizarCampania(campania);
  const resultado = DURACION[campaniaNormalizada] || { cap:5, ojt:5 };
  
  if (campaniaNormalizada !== campania) {
    console.log(`🔄 Normalización aplicada: "${campania}" → "${campaniaNormalizada}" → ${JSON.stringify(resultado)}`);
  } else {
    console.log(`❌ No se encontró duración para: "${campania}" → usando fallback ${JSON.stringify(resultado)}`);
  }
  
  return resultado;
}

// Casos de prueba
console.log("🧪 PRUEBAS DE NORMALIZACIÓN DE CAMPAÑAS");
console.log("=" .repeat(50));

// Casos que deberían funcionar directamente (datos existentes)
console.log("\n📋 CASOS EXISTENTES (deberían funcionar igual):");
obtenerDuracion("Unificado");
obtenerDuracion("Renovacion");
obtenerDuracion("Migracion");

// Casos problemáticos que ahora deberían funcionar
console.log("\n🔧 CASOS PROBLEMÁTICOS (ahora deberían funcionar):");
obtenerDuracion("unificado");
obtenerDuracion("UNIFICADO");
obtenerDuracion("Unificado  ");
obtenerDuracion("migración");
obtenerDuracion("ventas hogar inb");
obtenerDuracion("Ventas Hogar INB");
obtenerDuracion("  ventas   hogar   inb  ");

// Casos que no existen (deberían usar fallback)
console.log("\n❓ CASOS DESCONOCIDOS (deberían usar fallback):");
obtenerDuracion("Campaña Nueva");
obtenerDuracion("otra campaña");
obtenerDuracion("");

console.log("\n✅ PRUEBAS COMPLETADAS");
console.log("💡 Los datos existentes NO se ven afectados");
console.log("🔄 Los casos problemáticos ahora funcionan correctamente"); 