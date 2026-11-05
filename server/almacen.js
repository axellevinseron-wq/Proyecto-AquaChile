// Persistencia en un archivo JSON (sin base de datos externa). Se escribe de forma atómica:
// primero a un archivo temporal y después se renombra, para no dejar el archivo a medias.
// Con ruta null los datos viven solo en memoria (así se usan en los tests).

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { crearDatosIniciales } from "./seed.js";

export function crearAlmacen(ruta = null) {
  let datos = null;

  if (ruta && existsSync(ruta)) {
    try {
      datos = JSON.parse(readFileSync(ruta, "utf8"));
    } catch {
      throw new Error(`El archivo de datos ${ruta} está dañado. Corrígelo o bórralo para partir de cero.`);
    }
  }

  const almacen = {
    // La presencia (quién está conectado) no se conserva entre reinicios.
    datos: { ...crearDatosIniciales(), ...datos, presencia: {} },
    guardar() {
      if (!ruta) {
        return;
      }
      mkdirSync(dirname(ruta), { recursive: true });
      const temporal = `${ruta}.tmp`;
      writeFileSync(temporal, JSON.stringify(almacen.datos, null, 2));
      renameSync(temporal, ruta);
    },
  };

  if (!datos) {
    almacen.guardar();
  }
  return almacen;
}
