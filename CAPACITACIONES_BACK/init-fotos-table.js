require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: Number(process.env.SQL_PORT),
  options: { encrypt: false, trustServerCertificate: true }
};

async function initFotosTable() {
  try {
    console.log('🔧 Conectando a la base de datos...');
    await sql.connect(dbConfig);
    console.log('✅ Conectado a SQL Server');

    console.log('🔧 Creando tabla Fotos_Perfil...');
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Fotos_Perfil' AND xtype='U')
      CREATE TABLE Fotos_Perfil (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dni VARCHAR(20) NOT NULL UNIQUE,
        foto_url VARCHAR(500) NOT NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_actualizacion DATETIME DEFAULT GETDATE()
      )
    `);
    
    console.log('✅ Tabla Fotos_Perfil creada o ya existía');
    console.log('🎉 Sistema de fotos de perfil listo para usar');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

initFotosTable(); 