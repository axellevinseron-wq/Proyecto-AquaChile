package cl.aquachile.backend.oferta.controller;

import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/publico/ofertas")
public class OfertaPublicaController {
    private final OfertaRepository repo;
    public OfertaPublicaController(OfertaRepository repo) { this.repo = repo; }
    @GetMapping public List<Oferta> listar(@RequestParam(required=false) String categoria,@RequestParam(required=false) String buscar) {
 return repo.findByPublicadaTrueOrderByTituloAsc().stream()
 .filter(o->categoria==null||categoria.isBlank()||(o.categoria()!=null&&o.categoria().equalsIgnoreCase(categoria)))
 .filter(o->buscar==null||buscar.isBlank()||o.titulo().toLowerCase(java.util.Locale.ROOT).contains(buscar.toLowerCase(java.util.Locale.ROOT))||(o.descripcion()!=null&&o.descripcion().toLowerCase(java.util.Locale.ROOT).contains(buscar.toLowerCase(java.util.Locale.ROOT))))
 .toList(); }
    @GetMapping("/{id}") public Oferta detalle(@PathVariable UUID id) {
        return repo.findById(id).filter(Oferta::publicada)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Oferta no disponible"));
    }
}
