package cl.aquachile.backend.postulacion.dto;

import jakarta.validation.constraints.*;import java.util.UUID;
public record PostulacionRequest(@NotNull UUID ofertaId, @NotNull UUID postulanteId, String estado) {}
