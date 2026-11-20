package cl.aquachile.backend.postulante.dto;

import jakarta.validation.constraints.*;import java.util.UUID;
public record PostulanteRequest(@NotBlank String nombre, @NotBlank String correo, String telefono, String rut) {}
