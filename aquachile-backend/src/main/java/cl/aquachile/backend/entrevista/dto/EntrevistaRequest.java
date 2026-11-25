package cl.aquachile.backend.entrevista.dto;

public record EntrevistaRequest(
        String googleAccessToken,
        String inicio,
        String zonaHoraria,
        Integer duracionMinutos
) {}
