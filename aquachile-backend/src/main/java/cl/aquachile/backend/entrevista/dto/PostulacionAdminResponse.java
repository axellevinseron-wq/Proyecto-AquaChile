package cl.aquachile.backend.entrevista.dto;

import java.time.Instant;
import java.util.UUID;

public record PostulacionAdminResponse(
        UUID id,
        String nombre,
        String correo,
        String telefono,
        String ofertaTitulo,
        String estado,
        Instant fecha,
        String mensaje,
        CvResumen cv,
        EntrevistaResumen entrevista
) {}
