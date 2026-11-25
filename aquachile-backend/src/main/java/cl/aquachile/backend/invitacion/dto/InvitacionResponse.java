package cl.aquachile.backend.invitacion.dto;

import cl.aquachile.backend.invitacion.entity.Invitacion;
import cl.aquachile.backend.usuario.entity.Rol;
import java.time.Instant;
import java.util.UUID;

public record InvitacionResponse(
        UUID id,
        String nombre,
        String correo,
        Rol rol,
        Instant creada,
        Instant expira,
        Instant usada,
        Instant revocada
) {
    public static InvitacionResponse desde(Invitacion invitacion) {
        return new InvitacionResponse(invitacion.id(), invitacion.nombre(), invitacion.correo(),
                invitacion.rol(), invitacion.creada(), invitacion.expira(),
                invitacion.usada(), invitacion.revocada());
    }
}
