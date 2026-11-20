package cl.aquachile.backend.oferta.controller;

import cl.aquachile.backend.oferta.entity.Oferta;import cl.aquachile.backend.oferta.service.OfertaService;import cl.aquachile.backend.oferta.dto.OfertaRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import org.springframework.http.*;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/ofertas") public class OfertaController {
 private final OfertaService service; public OfertaController(OfertaService service){this.service=service;}
 @GetMapping public List<Oferta> listar(){return service.listar();}
 @GetMapping("/{id}") public Oferta obtener(@PathVariable UUID id){return service.obtener(id);}
 @PostMapping public ResponseEntity<Oferta> crear(@Valid @RequestBody OfertaRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(r));}
 @PutMapping("/{id}") public Oferta actualizar(@PathVariable UUID id,@Valid @RequestBody OfertaRequest r){return service.actualizar(id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@PathVariable UUID id){service.eliminar(id);}
}
