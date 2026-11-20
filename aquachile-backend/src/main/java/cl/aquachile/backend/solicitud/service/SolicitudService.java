package cl.aquachile.backend.solicitud.service;

import cl.aquachile.backend.solicitud.repository.SolicitudRepository;import cl.aquachile.backend.solicitud.entity.Solicitud;import cl.aquachile.backend.solicitud.dto.SolicitudRequest;import org.springframework.stereotype.Service;import org.springframework.web.server.ResponseStatusException;import org.springframework.http.HttpStatus;import java.util.*;import cl.aquachile.backend.postulacion.repository.PostulacionRepository;import cl.aquachile.backend.usuario.repository.UsuarioRepository;import cl.aquachile.backend.usuario.entity.Rol;
@Service public class SolicitudService {
 private final SolicitudRepository repo;private final PostulacionRepository postulaciones;private final UsuarioRepository usuarios;public SolicitudService(SolicitudRepository repo,PostulacionRepository postulaciones,UsuarioRepository usuarios){this.repo=repo;this.postulaciones=postulaciones;this.usuarios=usuarios;}
 public List<Solicitud> listar(){return repo.listar();}
 public Solicitud obtener(UUID id){return repo.obtener(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Solicitud no encontrado"));}
 private void validar(SolicitudRequest r){if(!postulaciones.existsById(r.postulacionId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Postulacion inexistente");if(r.evaluadorId()!=null){var evaluador=usuarios.findById(r.evaluadorId()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Evaluador inexistente"));if(evaluador.rol()!=Rol.EVALUADOR && evaluador.rol()!=Rol.ADMIN)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El responsable debe ser evaluador o administrador");}}
 public Solicitud crear(SolicitudRequest r){validar(r);return repo.guardar(new Solicitud(UUID.randomUUID(),r.postulacionId(), r.evaluadorId(), r.estado(), r.observaciones(), r.fechaSolicitud()!=null?r.fechaSolicitud():java.time.LocalDate.now(), r.fechaEvaluacion()));}
 public Solicitud actualizar(UUID id,SolicitudRequest r){obtener(id);validar(r);return repo.guardar(new Solicitud(id,r.postulacionId(), r.evaluadorId(), r.estado(), r.observaciones(), r.fechaSolicitud()!=null?r.fechaSolicitud():java.time.LocalDate.now(), r.fechaEvaluacion()));}
 public void eliminar(UUID id){obtener(id);repo.eliminar(id);}
}
