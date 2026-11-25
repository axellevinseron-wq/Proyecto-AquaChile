package cl.aquachile.backend.entrevista.dto;

import cl.aquachile.backend.entrevista.entity.Entrevista;
import java.time.Instant;

public record EntrevistaResumen(
        String estado,
        Instant inicio,
        String zonaHoraria,
        int duracionMinutos,
        String enlaceCalendar,
        String enlaceMeet
) {
    public static EntrevistaResumen desde(Entrevista entrevista) {
        if (entrevista == null) return null;
        int duracion = Math.toIntExact(java.time.Duration.between(entrevista.inicio(), entrevista.fin()).toMinutes());
        return new EntrevistaResumen(entrevista.estado(), entrevista.inicio(),
                entrevista.zonaHoraria(), duracion, entrevista.enlaceCalendar(), entrevista.enlaceMeet());
    }
}
