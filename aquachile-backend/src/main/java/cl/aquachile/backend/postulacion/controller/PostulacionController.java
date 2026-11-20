package cl.aquachile.backend.postulacion.controller;

import cl.aquachile.backend.postulacion.entity.Postulacion;import cl.aquachile.backend.postulacion.service.PostulacionService;import cl.aquachile.backend.postulacion.dto.PostulacionRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import org.springframework.http.*;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/postulaciones") public class PostulacionController {
 private final PostulacionService service; public PostulacionController(PostulacionService service){this.service=service;}
 @GetMapping public List<Postulacion> listar(){return service.listar();}
 @GetMapping("/{id}") public Postulacion obtener(@PathVariable UUID id){return service.obtener(id);}
 @PostMapping public ResponseEntity<Postulacion> crear(@Valid @RequestBody PostulacionRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(r));}
 @PutMapping("/{id}") public Postulacion actualizar(@PathVariable UUID id,@Valid @RequestBody PostulacionRequest r){return service.actualizar(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@PathVariable UUID id){service.eliminar(id);}
}
