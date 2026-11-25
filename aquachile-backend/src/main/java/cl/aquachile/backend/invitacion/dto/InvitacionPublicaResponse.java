package cl.aquachile.backend.invitacion.dto;

import cl.aquachile.backend.invitacion.entity.Invitacion;
import cl.aquachile.backend.usuario.entity.Rol;
import java.time.Instant;

public record InvitacionPublicaResponse(String nombre, String correo, Rol rol, Instant expira) {
    public static InvitacionPublicaResponse desde(Invitacion invitacion) {
        return new InvitacionPublicaResponse(invitacion.nombre(), invitacion.correo(),
                invitacion.rol(), invitacion.expira());
    }
}
