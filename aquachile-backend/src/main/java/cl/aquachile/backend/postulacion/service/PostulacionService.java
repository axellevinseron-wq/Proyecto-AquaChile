package cl.aquachile.backend.postulacion.service;

import cl.aquachile.backend.postulacion.repository.PostulacionRepository;import cl.aquachile.backend.postulacion.entity.Postulacion;import cl.aquachile.backend.postulacion.dto.PostulacionRequest;import org.springframework.stereotype.Service;import org.springframework.web.server.ResponseStatusException;import org.springframework.http.HttpStatus;import java.util.*;import cl.aquachile.backend.oferta.repository.OfertaRepository;import cl.aquachile.backend.postulante.repository.PostulanteRepository;
@Service public class PostulacionService {
 private final PostulacionRepository repo; private final OfertaRepository ofertas; private final PostulanteRepository postulantes; public PostulacionService(PostulacionRepository repo, OfertaRepository ofertas, PostulanteRepository postulantes){this.repo=repo;this.ofertas=ofertas;this.postulantes=postulantes;}
 public List<Postulacion> listar(){return repo.listar();}
 public Postulacion obtener(UUID id){return repo.obtener(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Postulacion no encontrado"));}
 private void validar(PostulacionRequest r){if(!ofertas.existsById(r.ofertaId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Oferta inexistente");if(!postulantes.existsById(r.postulanteId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Postulante inexistente");}
 public Postulacion crear(PostulacionRequest r){validar(r);return repo.guardar(new Postulacion(UUID.randomUUID(),r.ofertaId(), r.postulanteId(), r.estado()));}
 public Postulacion actualizar(UUID id,PostulacionRequest r){obtener(id);validar(r);return repo.guardar(new Postulacion(id,r.ofertaId(), r.postulanteId(), r.estado()));}
 public void eliminar(UUID id){obtener(id);repo.eliminar(id);}
}
