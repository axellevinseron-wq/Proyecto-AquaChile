package cl.aquachile.backend.entrevista.controller;

import cl.aquachile.backend.entrevista.dto.EntrevistaRequest;
import cl.aquachile.backend.entrevista.dto.PostulacionAdminResponse;
import cl.aquachile.backend.entrevista.service.EntrevistaService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class PostulacionAdminController {
    private final EntrevistaService service;

    public PostulacionAdminController(EntrevistaService service) {
        this.service = service;
    }

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/api/postulaciones/administracion")
    public List<PostulacionAdminResponse> listar() {
        return service.listar();
    }

    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/api/admin/postulaciones/{id}/estado")
    public PostulacionAdminResponse actualizarEstado(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return service.actualizarEstado(id, request.get("estado"));
    }

    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/api/admin/postulaciones/{id}/entrevista")
    public ResponseEntity<Map<String, PostulacionAdminResponse>> agendar(
            @PathVariable UUID id,
            @RequestBody EntrevistaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("postulacion", service.agendar(id, request)));
    }

    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/api/admin/postulaciones/{id}/entrevista")
    public Map<String, PostulacionAdminResponse> reprogramar(
            @PathVariable UUID id,
            @RequestBody EntrevistaRequest request) {
        return Map.of("postulacion", service.reprogramar(id, request));
    }

    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/api/admin/postulaciones/{id}/entrevista")
    public Map<String, PostulacionAdminResponse> cancelar(
            @PathVariable UUID id,
            @RequestBody EntrevistaRequest request) {
        return Map.of("postulacion", service.cancelar(id, request));
    }
}
