package cl.aquachile.backend.postulante.controller;

import cl.aquachile.backend.postulante.entity.Postulante;import cl.aquachile.backend.postulante.service.PostulanteService;import cl.aquachile.backend.postulante.dto.PostulanteRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import org.springframework.http.*;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/postulantes") public class PostulanteController {
 private final PostulanteService service; public PostulanteController(PostulanteService service){this.service=service;}
 @GetMapping public List<Postulante> listar(){return service.listar();}
 @GetMapping("/{id}") public Postulante obtener(@PathVariable UUID id){return service.obtener(id);}
 @PostMapping public ResponseEntity<Postulante> crear(@Valid @RequestBody PostulanteRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(r));}
 @PutMapping("/{id}") public Postulante actualizar(@PathVariable UUID id,@Valid @RequestBody PostulanteRequest r){return service.actualizar(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@PathVariable UUID id){service.eliminar(id);}
}
