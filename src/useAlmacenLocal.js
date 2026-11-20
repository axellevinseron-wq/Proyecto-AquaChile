import { useEffect, useState } from "react";


export function useAlmacenLocal(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave));
      return Array.isArray(guardado) ? guardado : inicial;
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      
    }
  }, [clave, valor]);

  return [valor, setValor];
}
