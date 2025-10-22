require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const sql     = require("mssql");
const path    = require("path");
const routes  = require("./routers/api");
const os      = require("os");

const dbConfig = {
  server  : process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user    : process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port    : Number(process.env.SQL_PORT),
  options : { 
    encrypt: false, 
    trustServerCertificate: true,
    requestTimeout: 60000,  // 60 segundos
    connectionTimeout: 30000 // 30 segundos
  }
};

// Verificar que todas las variables de entorno estén definidas
const requiredEnvVars = ['SQL_SERVER', 'SQL_DATABASE', 'SQL_USER', 'SQL_PASSWORD', 'SQL_PORT', 'PORT', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Variables de entorno faltantes:", missingVars);
  console.error("📝 Crea un archivo .env en la carpeta CAPACITACIONES_BACK con las siguientes variables:");
  console.error("SQL_SERVER=tu_servidor");
  console.error("SQL_DATABASE=tu_base_de_datos");
  console.error("SQL_USER=tu_usuario");
  console.error("SQL_PASSWORD=tu_contraseña");
  console.error("SQL_PORT=1433");
  console.error("PORT=3003");
  console.error("JWT_SECRET=tu_clave_secreta");
  process.exit(1);
}

console.log("🔧 Configuración de base de datos:", {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  port: process.env.SQL_PORT
});

(async () => {
  try {
    await sql.connect(dbConfig);
    console.log("✅ Conectado a SQL Server");
  } catch (e) {
    console.error("❌ Error de conexión a SQL Server:");
    console.error("   - Verifica que el servidor esté ejecutándose");
    console.error("   - Verifica las credenciales en el archivo .env");
    console.error("   - Verifica que puedas conectarte desde tu máquina");
    console.error("   - Error detallado:", e.message);
    process.exit(1);
  }
})();

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api", routes);        // <── todas las rutas

const PORT = process.env.PORT;

// Función para obtener todas las interfaces de red
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets) {
      // Solo mostrar interfaces IPv4 que no sean loopback
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          name: name,
          address: net.address,
          url: `http://${net.address}:${PORT}`
        });
      }
    }
  }
  
  return addresses;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`\n🌐 INFORMACIÓN DE RED DEL SERVIDOR:`);
  console.log(`=====================================`);
  console.log(`🌐 Todas las IPs disponibles:`);
  
  const networkAddresses = getNetworkInterfaces();
  if (networkAddresses.length > 0) {
    networkAddresses.forEach(addr => {
      console.log(`   http://${addr.address}:${PORT}`);
    });
  } else {
    console.log(`   http://localhost:${PORT}`);
  }
  console.log(`=====================================\n`);
});
