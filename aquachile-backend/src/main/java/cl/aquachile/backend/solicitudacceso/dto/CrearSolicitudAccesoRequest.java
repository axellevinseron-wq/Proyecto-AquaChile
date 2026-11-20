package cl.aquachile.backend.solicitudacceso.dto;

import jakarta.validation.constraints.*;

public record CrearSolicitudAccesoRequest(
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank String rut,
        @NotBlank String telefono,
        @NotBlank @Email String correo,
        @NotBlank String usuarioSolicitado,
        @NotBlank String motivo
) {}
