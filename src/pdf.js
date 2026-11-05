// Generador de PDF muy simple (solo texto), sin librerías externas.
// Un PDF es un archivo de texto con "objetos" numerados y una tabla (xref) que dice en qué
// posición empieza cada uno. Aquí armamos los objetos a mano y descargamos el resultado.

const ANCHO = 595; // A4 en puntos
const ALTO = 842;
const MARGEN = 56;

// Cada carácter del archivo ocupa 1 byte, así que solo dejamos caracteres Latin-1 (tildes y ñ incluidas).
function limpiar(texto) {
  return String(texto ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function escapar(texto) {
  return texto.replace(/([\\()])/g, "\\$1");
}

// Parte un texto largo en varias líneas que quepan en el ancho de la página.
function partirLinea(texto, tamano) {
  const maximo = Math.floor((ANCHO - MARGEN * 2) / (tamano * 0.52));
  const resultado = [];
  let actual = "";
  for (const palabra of limpiar(texto).split(" ")) {
    let trozo = palabra;
    while (trozo.length > maximo) {
      if (actual) {
        resultado.push(actual);
        actual = "";
      }
      resultado.push(trozo.slice(0, maximo));
      trozo = trozo.slice(maximo);
    }
    if (actual && (actual + " " + trozo).length > maximo) {
      resultado.push(actual);
      actual = trozo;
    } else {
      actual = actual ? `${actual} ${trozo}` : trozo;
    }
  }
  resultado.push(actual);
  return resultado;
}

// lineas: [{ texto, tamano = 11, negrita = false, antes = 0 }]
// Devuelve los bytes del PDF.
export function crearPdf(lineas) {
  const paginas = [[]];
  let y = ALTO - MARGEN;

  for (const { texto, tamano = 11, negrita = false, antes = 0 } of lineas) {
    y -= antes;
    for (const parte of partirLinea(texto, tamano)) {
      y -= tamano * 1.45;
      if (y < MARGEN) {
        paginas.push([]);
        y = ALTO - MARGEN - tamano * 1.45;
      }
      const fuente = negrita ? "F2" : "F1";
      paginas[paginas.length - 1].push(
        `BT /${fuente} ${tamano} Tf ${MARGEN} ${y.toFixed(2)} Td (${escapar(parte)}) Tj ET`,
      );
    }
  }

  // Objetos: 1 catálogo, 2 páginas, 3 y 4 fuentes, luego (contenido, página) por cada hoja.
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((_, i) => `${6 + i * 2} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  paginas.forEach((comandos, i) => {
    const contenido = comandos.join("\n");
    objetos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
  });

  let archivo = "%PDF-1.4\n";
  const posiciones = [];
  objetos.forEach((objeto, i) => {
    posiciones.push(archivo.length);
    archivo += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioXref = archivo.length;
  archivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) {
    archivo += `${String(posicion).padStart(10, "0")} 00000 n \n`;
  }
  archivo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  return Uint8Array.from(archivo, (c) => c.charCodeAt(0));
}

export function descargarPdf(nombreArchivo, lineas) {
  const blob = new Blob([crearPdf(lineas)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
