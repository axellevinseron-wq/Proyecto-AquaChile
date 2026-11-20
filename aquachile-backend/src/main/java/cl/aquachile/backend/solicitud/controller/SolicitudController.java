package cl.aquachile.backend.solicitud.controller;

import cl.aquachile.backend.solicitud.entity.Solicitud;import cl.aquachile.backend.solicitud.service.SolicitudService;import cl.aquachile.backend.solicitud.dto.SolicitudRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import org.springframework.http.*;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/solicitudes") public class SolicitudController {
 private final SolicitudService service; public SolicitudController(SolicitudService service){this.service=service;}
 @GetMapping public List<Solicitud> listar(){return service.listar();}
 @GetMapping("/{id}") public Solicitud obtener(@PathVariable UUID id){return service.obtener(id);}
 @PostMapping public ResponseEntity<Solicitud> crear(@Valid @RequestBody SolicitudRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(r));}
 @PutMapping("/{id}") public Solicitud actualizar(@PathVariable UUID id,@Valid @RequestBody SolicitudRequest r){return service.actualizar(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@PathVariable UUID id){service.eliminar(id);}
}
