package cl.aquachile.backend.invitacion.dto;

import cl.aquachile.backend.usuario.entity.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CrearInvitacionRequest(
        @NotBlank @Size(max = 120) String nombre,
        @NotBlank @Email @Size(max = 254) String correo,
        @NotNull Rol rol
) {}
