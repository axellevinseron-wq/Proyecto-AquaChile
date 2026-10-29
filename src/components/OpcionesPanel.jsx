import { useEffect, useState } from "react";
import { FONDOS, GRUPOS_FONDO, SIN_FONDO } from "../fondos";
import { LIMITES, OPCIONES_INICIALES } from "../opciones";

function ControlTamano({ id, titulo, ayuda, valor, limites, onChange }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="form-label d-flex justify-content-between">
        <span>{titulo}</span>
        <strong>{valor}%</strong>
      </label>
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(valor - LIMITES.paso)}
          disabled={valor <= limites.min}
          aria-label={`Reducir ${titulo.toLowerCase()}`}
        >
          A−
        </button>
        <input
          id={id}
          type="range"
          className="form-range"
          min={limites.min}
          max={limites.max}
          step={LIMITES.paso}
          value={valor}
          onChange={(evento) => onChange(Number(evento.target.value))}
        />
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(valor + LIMITES.paso)}
          disabled={valor >= limites.max}
          aria-label={`Aumentar ${titulo.toLowerCase()}`}
        >
          A+
        </button>
      </div>
      <div className="form-text">{ayuda}</div>
    </div>
  );
}

function OpcionFondo({ fondo, activo, onElegir }) {
  return (
    <button
      type="button"
      className={`fondo-opcion ${activo ? "activo" : ""}`}
      aria-pressed={activo}
      onClick={() => onElegir(fondo)}
    >
      <span
        className="fondo-opcion__vista"
        style={fondo.miniatura ? { backgroundImage: `url("${fondo.miniatura}")` } : undefined}
      >
        {!fondo.miniatura && "Blanco"}
      </span>
      <span className="fondo-opcion__nombre">{fondo.nombre}</span>
    </button>
  );
}

function OpcionesPanel({ opciones, onCambiar }) {
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
  const fondoActual = FONDOS.find((f) => f.id === opciones.fondo) ?? SIN_FONDO;

  // Escape cierra la ventana de fondos.
  useEffect(() => {
    if (!ventanaAbierta) {
      return undefined;
    }
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setVentanaAbierta(false);
      }
    }
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [ventanaAbierta]);

  function elegirFondo(fondo) {
    // Cada fondo activa su modo; "Sin fondo" no cambia el modo actual.
    onCambiar(fondo.grupo ? { fondo: fondo.id, oscuro: fondo.grupo === "oscuro" } : { fondo: fondo.id });
    setVentanaAbierta(false);
  }

  return (
    <section aria-labelledby="titulo-opciones">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
        <h1 className="h3 mb-0" id="titulo-opciones">Opciones</h1>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onCambiar(OPCIONES_INICIALES)}
        >
          Restablecer valores
        </button>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6 d-flex flex-column gap-3">
          <div className="card card-body caja caja--azul">
            <h2 className="h5 mb-3">Apariencia</h2>
            <div className="form-check form-switch">
              <input
                id="opcion-oscuro"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={opciones.oscuro}
                onChange={(evento) => onCambiar({ oscuro: evento.target.checked })}
              />
              <label className="form-check-label" htmlFor="opcion-oscuro">
                Modo oscuro
              </label>
            </div>
            <p className="form-text mb-0">
              Por defecto el sistema es blanco. Actívalo para usar la página y el menú lateral en
              tonos oscuros.
            </p>
          </div>

          <div className="card card-body caja caja--azul">
            <h2 className="h5 mb-3">Tamaño</h2>
            <ControlTamano
              id="opcion-letra"
              titulo="Tamaño de letra"
              ayuda="Agranda o achica los textos."
              valor={opciones.letra}
              limites={LIMITES.letra}
              onChange={(letra) => onCambiar({ letra })}
            />
            <ControlTamano
              id="opcion-sistema"
              titulo="Tamaño del sistema"
              ayuda="Agranda o achica todo: textos, tarjetas, botones y menús."
              valor={opciones.sistema}
              limites={LIMITES.sistema}
              onChange={(sistema) => onCambiar({ sistema })}
            />
            <p className="mb-0">
              Texto de ejemplo: así se verán los textos del sistema.
            </p>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card card-body caja caja--azul h-100">
            <h2 className="h5 mb-1">Fondo</h2>
            <p className="form-text mt-0 mb-3">Elige el fondo de las pantallas del sistema.</p>

            <div className="fondo-actual">
              <span
                className="fondo-opcion__vista fondo-actual__vista"
                style={fondoActual.miniatura ? { backgroundImage: `url("${fondoActual.miniatura}")` } : undefined}
              >
                {!fondoActual.miniatura && "Blanco"}
              </span>
              <div>
                <p className="mb-0 fw-bold">{fondoActual.nombre}</p>
                <p className="form-text mt-0 mb-2">Fondo actual</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setVentanaAbierta(true)}
                >
                  Elegir fondo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {ventanaAbierta && (
        <div className="ventana-fondo" onClick={() => setVentanaAbierta(false)}>
          <div
            className="ventana ventana--ancha"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ventana-fondos-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="ventana__cabecera">
              <h3 className="h5 mb-0" id="ventana-fondos-titulo">Elegir fondo</h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={() => setVentanaAbierta(false)}
              />
            </div>

            <div className="fondos fondos--sin">
              <OpcionFondo fondo={SIN_FONDO} activo={opciones.fondo === SIN_FONDO.id} onElegir={elegirFondo} />
            </div>

            {GRUPOS_FONDO.map((grupo) => (
              <div key={grupo.id} className="fondos-grupo">
                <h4 className="h6 mb-0">{grupo.titulo}</h4>
                <p className="form-text mt-0 mb-2">{grupo.descripcion}</p>
                <div className="fondos">
                  {FONDOS.filter((f) => f.grupo === grupo.id).map((fondo) => (
                    <OpcionFondo
                      key={fondo.id}
                      fondo={fondo}
                      activo={opciones.fondo === fondo.id}
                      onElegir={elegirFondo}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default OpcionesPanel;
