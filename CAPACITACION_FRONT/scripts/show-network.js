#!/usr/bin/env node
import os from 'os';

// Función para obtener todas las interfaces de red
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  const port = process.env.VITE_FRONTEND_PORT;
  
  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets) {
      // Solo mostrar interfaces IPv4 que no sean loopback
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          name: name,
          address: net.address,
          url: `http://${net.address}:${port}`
        });
      }
    }
  }
  
  return addresses;
}

// Mostrar interfaces de red
const port = process.env.VITE_FRONTEND_PORT;
console.log(`\n🌐 INFORMACIÓN DE RED DEL FRONTEND:`);
console.log(`=====================================`);
console.log(`🌐 Todas las IPs disponibles:`);

const networkInterfaces = getNetworkInterfaces();
if (networkInterfaces.length > 0) {
  networkInterfaces.forEach(iface => {
    console.log(`   ${iface.url}`);
  });
} else {
  console.log(`   http://localhost:${port}`);
}
console.log(`=====================================\n`);

console.log('🚀 Iniciando servidor de desarrollo...\n');
