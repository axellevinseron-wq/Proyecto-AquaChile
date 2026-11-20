package cl.aquachile.backend.usuario.dto;

import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.entity.Usuario;
import java.util.UUID;

public record UsuarioResponse(UUID id, String nombre, String correo, Rol rol, boolean activo) {
    public static UsuarioResponse desde(Usuario usuario) {
        return new UsuarioResponse(usuario.id(), usuario.nombre(), usuario.correo(), usuario.rol(), usuario.activo());
    }
}
