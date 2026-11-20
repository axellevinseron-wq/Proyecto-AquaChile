package cl.aquachile.backend.postulante.service;

import cl.aquachile.backend.postulante.repository.PostulanteRepository;import cl.aquachile.backend.postulante.entity.Postulante;import cl.aquachile.backend.postulante.dto.PostulanteRequest;import org.springframework.stereotype.Service;import org.springframework.web.server.ResponseStatusException;import org.springframework.http.HttpStatus;import java.util.*;
@Service public class PostulanteService {
 private final PostulanteRepository repo; public PostulanteService(PostulanteRepository repo){this.repo=repo;}
 public List<Postulante> listar(){return repo.listar();}
 public Postulante obtener(UUID id){return repo.obtener(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Postulante no encontrado"));}
 public Postulante crear(PostulanteRequest r){return repo.guardar(new Postulante(UUID.randomUUID(),r.nombre(), r.correo(), r.telefono(), r.rut()));}
 public Postulante actualizar(UUID id,PostulanteRequest r){obtener(id);return repo.guardar(new Postulante(id,r.nombre(), r.correo(), r.telefono(), r.rut()));}
 public void eliminar(UUID id){obtener(id);repo.eliminar(id);}
}
