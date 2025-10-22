// Archivo de ejemplo de configuración
// Copia este archivo como .env en la carpeta CAPACITACIONES_BACK

module.exports = {
  // Configuración de SQL Server
  SQL_SERVER: '172.16.248.48',
  SQL_DATABASE: 'tu_base_de_datos', // Reemplaza con el nombre de tu base de datos
  SQL_USER: 'tu_usuario', // Reemplaza con tu usuario de SQL Server
  SQL_PASSWORD: 'tu_contraseña', // Reemplaza con tu contraseña
  SQL_PORT: 1433,
  
  // Puerto del servidor
  PORT: 3003,
  
  // Clave secreta para JWT (cambia por una clave segura)
  JWT_SECRET: 'tu_clave_secreta_muy_segura_aqui'
}; 