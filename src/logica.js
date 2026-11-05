export const ESTADOS_SOLICITUD = ["Pendiente", "En proceso", "Finalizada"];

const REGEX_CORREO = /^\S+@\S+\.\S+$/;

function normalizar(texto) {
  return (texto ?? "").toLocaleLowerCase("es");
}

export function correoValido(correo) {
  return REGEX_CORREO.test(correo.trim());
}

// RUT chileno: acepta puntos y guion; comprueba el dígito verificador.
export function rutValido(rut) {
  const limpio = (rut ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) {
    return false;
  }
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return limpio.slice(-1) === esperado;
}

export function telefonoValido(telefono) {
  return /^\+?\d{8,12}$/.test((telefono ?? "").replace(/[\s-]/g, ""));
}

export function filtrarSolicitudes(solicitudes, busqueda, estado) {
  const termino = normalizar(busqueda.trim());
  return solicitudes.filter((solicitud) => {
    const coincideTexto = [
      solicitud.candidato,
      solicitud.cargo,
      solicitud.familiaCargo,
      solicitud.responsable,
    ].some((valor) => normalizar(valor).includes(termino));
    const coincideEstado = !estado || solicitud.estado === estado;
    return coincideTexto && coincideEstado;
  });
}

export function filtrarCandidatos(candidatos, busqueda, estado) {
  const termino = normalizar(busqueda.trim());
  return candidatos.filter((candidato) => {
    const coincideTexto = [
      candidato.nombre,
      candidato.correo,
      candidato.cargo,
      candidato.familiaCargo,
    ].some((valor) => normalizar(valor).includes(termino));
    return coincideTexto && (!estado || candidato.estado === estado);
  });
}

export function validarCandidato({ nombre, correo, cargo, familiaCargo }) {
  if (!nombre.trim() || !correo.trim() || !cargo.trim() || !familiaCargo.trim()) {
    return "Completa todos los campos.";
  }
  if (!correoValido(correo)) {
    return "Ingresa un correo válido.";
  }
  return "";
}

export function validarSolicitud({ candidatoId, cargo, familiaCargo, responsable }) {
  if (!candidatoId || !cargo.trim() || !familiaCargo.trim() || !responsable.trim()) {
    return "Completa todos los campos para crear la solicitud.";
  }
  if (responsable.trim().length < 3) {
    return "El nombre del responsable debe tener al menos 3 caracteres.";
  }
  return "";
}

export function existeCorreo(candidatos, correo) {
  const buscado = correo.trim().toLowerCase();
  return candidatos.some((c) => c.correo.toLowerCase() === buscado);
}

export function cambiarEstadoSolicitud(solicitudes, solicitudId, nuevoEstado) {
  return solicitudes.map((solicitud) =>
    solicitud.id === solicitudId ? { ...solicitud, estado: nuevoEstado } : solicitud,
  );
}

export function contarPorEstado(solicitudes, estado) {
  return solicitudes.filter((solicitud) => solicitud.estado === estado).length;
}

export function calcularIndicadores(candidatos, solicitudes) {
  return [
    { id: "candidatos", valor: candidatos.length, titulo: "Candidatos registrados", color: "celeste" },
    { id: "pendientes", valor: contarPorEstado(solicitudes, "Pendiente"), titulo: "Solicitudes pendientes", color: "amarillo" },
    { id: "en-proceso", valor: contarPorEstado(solicitudes, "En proceso"), titulo: "Solicitudes en proceso", color: "azul" },
    { id: "finalizadas", valor: contarPorEstado(solicitudes, "Finalizada"), titulo: "Evaluaciones finalizadas", color: "verde" },
  ];
}