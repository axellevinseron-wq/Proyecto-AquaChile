package cl.aquachile.backend.auth.dto;

import cl.aquachile.backend.usuario.entity.Rol;

public record LoginResponse(String token, String tipo, String correo, String nombre,
                            Rol rol, long expiracion) {}
