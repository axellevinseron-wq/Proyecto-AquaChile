package cl.aquachile.backend.invitacion.controller;

import cl.aquachile.backend.invitacion.dto.*;
import cl.aquachile.backend.invitacion.service.InvitacionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
public class InvitacionController {
    private final InvitacionService service;

    public InvitacionController(InvitacionService service) {
        this.service = service;
    }

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/api/admin/invitaciones")
    public List<InvitacionResponse> listar() {
        return service.listar();
    }

    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/api/admin/invitaciones")
    public ResponseEntity<InvitacionCreadaResponse> crear(
            @Valid @RequestBody CrearInvitacionRequest request,
            org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(request, authentication.getName()));
    }

    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/api/admin/invitaciones/{id}/revocar")
    public ResponseEntity<Void> revocar(@PathVariable UUID id) {
        service.revocar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/publico/invitaciones/{token}")
    public ResponseEntity<InvitacionPublicaResponse> consultar(@PathVariable String token) {
        return ResponseEntity.ok()
                .header("Referrer-Policy", "no-referrer")
                .cacheControl(CacheControl.noStore())
                .body(service.consultar(token));
    }

    @PostMapping("/api/publico/invitaciones/{token}/aceptar")
    public ResponseEntity<Void> aceptar(
            @PathVariable String token,
            @Valid @RequestBody AceptarInvitacionRequest request) {
        service.aceptar(token, request);
        return ResponseEntity.noContent().build();
    }
}
