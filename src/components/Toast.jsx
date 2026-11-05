import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

const ToastContext = createContext({ notificar: () => {} });

// Cada aviso dura 5 segundos; la barra de abajo muestra el tiempo que le queda.
const DURACION_MS = 5000;

// Notificaciones flotantes ("toast") para avisar que una acción salió bien (o mal).
export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const siguienteId = useRef(1);
  const temporizadores = useRef(new Map());

  const cerrar = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const notificar = useCallback(
    (mensaje, tipo = "exito") => {
      const id = siguienteId.current++;
      setAvisos((actuales) => [...actuales, { id, mensaje, tipo }]);
      temporizadores.current.set(
        id,
        setTimeout(() => cerrar(id), DURACION_MS),
      );
    },
    [cerrar],
  );

  useEffect(() => {
    const activos = temporizadores.current;
    return () => activos.forEach((t) => clearTimeout(t));
  }, []);

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-zona" aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`toast-aviso toast-aviso--${aviso.tipo}`} role="status">
            <Icon nombre={aviso.tipo === "exito" ? "check" : "info"} size={18} />
            <span className="toast-aviso__texto">{aviso.mensaje}</span>
            <button
              type="button"
              className="toast-aviso__cerrar"
              aria-label="Cerrar notificación"
              onClick={() => cerrar(aviso.id)}
            >
              ×
            </button>
            <span className="toast-aviso__barra" style={{ animationDuration: `${DURACION_MS}ms` }} aria-hidden="true" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
