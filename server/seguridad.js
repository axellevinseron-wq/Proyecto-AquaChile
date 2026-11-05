// Contraseñas con hash (scrypt, incluido en Node: no necesita paquetes extra) y textos aleatorios.

import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export function hashClave(clave) {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(clave, sal, 64).toString("hex");
  return `scrypt$${sal}$${hash}`;
}

export function claveCoincide(clave, guardado) {
  const [tipo, sal, hash] = String(guardado ?? "").split("$");
  if (tipo !== "scrypt" || !sal || !hash) {
    return false;
  }
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(String(clave ?? ""), sal, esperado.length);
  return timingSafeEqual(esperado, calculado);
}

// Sin 0/O ni 1/I/L para que el código sea fácil de leer y escribir.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function textoAleatorio(largo) {
  return Array.from({ length: largo }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export function tokenSesion() {
  return randomBytes(32).toString("hex");
}
