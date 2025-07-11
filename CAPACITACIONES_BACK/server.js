require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const sql     = require("mssql");
const routes  = require("./routers/api");

const dbConfig = {
  server  : process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user    : process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port    : Number(process.env.SQL_PORT),
  options : { encrypt:false, trustServerCertificate:true }
};

(async () => {
  try {
    await sql.connect(dbConfig);
    console.log("✅ Conectado a SQL Server");
  } catch (e) {
    console.error("❌ Error de conexión:", e);
    process.exit(1);
  }
})();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", routes);        // <── todas las rutas

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
