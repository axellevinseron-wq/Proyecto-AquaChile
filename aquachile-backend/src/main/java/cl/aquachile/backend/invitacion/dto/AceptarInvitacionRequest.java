package cl.aquachile.backend.invitacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AceptarInvitacionRequest(
        @NotBlank @Size(min = 12, max = 72) String password
) {}
