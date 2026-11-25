package cl.aquachile.backend.invitacion.dto;

public record InvitacionCreadaResponse(
        InvitacionResponse invitacion,
        boolean correoEnviado,
        String enlace,
        String aviso
) {}
