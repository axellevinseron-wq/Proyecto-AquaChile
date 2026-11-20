package cl.aquachile.backend.solicitud.service;
import cl.aquachile.backend.solicitud.repository.SolicitudRepository;
import cl.aquachile.backend.solicitud.entity.Solicitud;
import cl.aquachile.backend.solicitud.dto.SolicitudRequest;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import cl.aquachile.backend.usuario.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class SolicitudServiceTest {
 final SolicitudRepository repo=mock(SolicitudRepository.class);
 final PostulacionRepository postulaciones=mock(PostulacionRepository.class);
 final UsuarioRepository usuarios=mock(UsuarioRepository.class);
 final SolicitudService service=new SolicitudService(repo,postulaciones,usuarios);
 final UUID id=UUID.randomUUID(),post=UUID.randomUUID(),eval=UUID.randomUUID();
 final SolicitudRequest request=new SolicitudRequest(post,null,"PENDIENTE","nota",null,null);
 @Test void lista(){when(repo.listar()).thenReturn(List.of());assertTrue(service.listar().isEmpty());}
 @Test void noExiste(){assertThrows(ResponseStatusException.class,()->service.obtener(id));}
 @Test void creaSinEvaluador(){when(postulaciones.existsById(post)).thenReturn(true);when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertNotNull(service.crear(request));}
 @Test void postulacionInexistente(){assertThrows(ResponseStatusException.class,()->service.crear(request));}
 @Test void evaluadorInexistente(){when(postulaciones.existsById(post)).thenReturn(true);var r=new SolicitudRequest(post,eval,"PENDIENTE",null,null,null);assertThrows(ResponseStatusException.class,()->service.crear(r));}
 @Test void evaluadorSinRol(){when(postulaciones.existsById(post)).thenReturn(true);when(usuarios.findById(eval)).thenReturn(Optional.of(new Usuario(eval,"Ana","ana@cl.cl","hash",Rol.ANALISTA_RECLUTAMIENTO,true)));var r=new SolicitudRequest(post,eval,"PENDIENTE",null,null,null);assertThrows(ResponseStatusException.class,()->service.crear(r));}
 @Test void evaluadorValido(){when(postulaciones.existsById(post)).thenReturn(true);when(usuarios.findById(eval)).thenReturn(Optional.of(new Usuario(eval,"Ana","ana@cl.cl","hash",Rol.EVALUADOR,true)));when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertNotNull(service.crear(new SolicitudRequest(post,eval,"PENDIENTE",null,null,null)));}
 @Test void actualiza(){when(repo.obtener(id)).thenReturn(Optional.of(mock(Solicitud.class)));when(postulaciones.existsById(post)).thenReturn(true);when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertNotNull(service.actualizar(id,request));}
 @Test void elimina(){when(repo.obtener(id)).thenReturn(Optional.of(mock(Solicitud.class)));service.eliminar(id);verify(repo).eliminar(id);}
}
