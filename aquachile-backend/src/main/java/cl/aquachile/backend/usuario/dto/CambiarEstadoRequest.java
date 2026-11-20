package cl.aquachile.backend.usuario.dto;

import jakarta.validation.constraints.NotNull;

public record CambiarEstadoRequest(@NotNull Boolean activo) {}
