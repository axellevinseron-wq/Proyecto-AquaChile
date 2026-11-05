// Punto de entrada del servidor: lee la configuración, abre el archivo de datos y escucha peticiones.
//   npm run server      -> servidor con recarga automática en desarrollo (puerto 3001)
//   npm start           -> sirve la API y el frontend compilado (npm run build primero)

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crearApp } from "./app.js";
import { crearAlmacen } from "./almacen.js";

const carpetaServidor = dirname(fileURLToPath(import.meta.url));

// Carga el archivo .env de la raíz del proyecto si existe (Node 20.12 o superior).
try {
  process.loadEnvFile(join(carpetaServidor, "..", ".env"));
} catch {
  // Sin .env se usan los valores por defecto.
}

const puerto = Number(process.env.PORT) || 3001;
const archivoDatos = resolve(process.env.DATA_FILE ?? join(carpetaServidor, "data", "db.json"));

const app = crearApp({
  almacen: crearAlmacen(archivoDatos),
  carpetaPublica: join(carpetaServidor, "..", "dist"),
  ejemplosDemo: process.env.EJEMPLOS_DEMO !== "false",
});

// Desde Express 5, si el servidor no puede arrancar (por ejemplo, puerto ocupado) el error llega aquí.
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo iniciar el servidor en el puerto ${puerto}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Servidor Express escuchando en http://localhost:${puerto}`);
  console.log(`Datos guardados en ${archivoDatos}`);
});
