package cl.aquachile.backend.usuario.dto;

import cl.aquachile.backend.usuario.entity.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CrearUsuarioRequest(
        @NotBlank @Size(max = 120) String nombre,
        @NotBlank @Email @Size(max = 180) String correo,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull Rol rol
) {}
