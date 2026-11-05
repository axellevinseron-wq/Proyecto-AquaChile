import { useEffect, useRef, useState } from "react";
import { pedir } from "./api";

// Como useState, pero la lista se carga desde el servidor Express y se guarda allí cada vez que cambia.
// Devuelve [valor, setValor, estado]; estado es "cargando", "listo" o "error".
// Si el servidor rechaza un cambio (por ejemplo, por falta de permiso), se vuelve a la lista del servidor
// y se avisa con alFallar(mensaje).
export function useAlmacenApi(nombre, inicial, alFallar) {
  const [valor, setValor] = useState(inicial);
  const [estado, setEstado] = useState("cargando");
  const guardado = useRef(null); // lo último que el servidor tiene, en texto
  const avisar = useRef(alFallar);

  useEffect(() => {
    avisar.current = alFallar;
  });

  useEffect(() => {
    let activo = true;
    pedir("GET", `/colecciones/${nombre}`).then((respuesta) => {
      if (!activo) return;
      if (respuesta.ok) {
        guardado.current = JSON.stringify(respuesta.datos.items);
        setValor(respuesta.datos.items);
      }
      setEstado(respuesta.ok ? "listo" : "error");
    });
    return () => {
      activo = false;
    };
  }, [nombre]);

  useEffect(() => {
    if (estado !== "listo") return;
    const actual = JSON.stringify(valor);
    if (actual === guardado.current) return;
    guardado.current = actual;

    pedir("PUT", `/colecciones/${nombre}`, { items: valor }).then(async (respuesta) => {
      if (respuesta.ok) return;
      avisar.current?.(respuesta.datos?.error ?? "No se pudieron guardar los cambios.");
      const vigente = await pedir("GET", `/colecciones/${nombre}`);
      if (vigente.ok) {
        guardado.current = JSON.stringify(vigente.datos.items);
        setValor(vigente.datos.items);
      }
    });
  }, [nombre, valor, estado]);

  return [valor, setValor, estado];
}
