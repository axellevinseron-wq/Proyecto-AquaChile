package cl.aquachile.backend.postulacion.service;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import cl.aquachile.backend.postulacion.dto.PostulacionRequest;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class PostulacionServiceTest {
 final PostulacionRepository repo=mock(PostulacionRepository.class);
 final OfertaRepository ofertas=mock(OfertaRepository.class);
 final PostulanteRepository postulantes=mock(PostulanteRepository.class);
 final PostulacionService service=new PostulacionService(repo,ofertas,postulantes);
 final UUID id=UUID.randomUUID(),oferta=UUID.randomUUID(),persona=UUID.randomUUID();
 final Postulacion original=new Postulacion(id,oferta,persona,"PENDIENTE");
 final PostulacionRequest request=new PostulacionRequest(oferta,persona,"PENDIENTE");
 void relaciones(){when(ofertas.existsById(oferta)).thenReturn(true);when(postulantes.existsById(persona)).thenReturn(true);}
 @Test void lista(){when(repo.listar()).thenReturn(List.of(original));assertEquals(1,service.listar().size());}
 @Test void obtiene(){when(repo.obtener(id)).thenReturn(Optional.of(original));assertEquals(id,service.obtener(id).id());}
 @Test void noExiste(){assertThrows(ResponseStatusException.class,()->service.obtener(id));}
 @Test void crea(){relaciones();when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertEquals(oferta,service.crear(request).ofertaId());}
 @Test void ofertaInexistente(){assertThrows(ResponseStatusException.class,()->service.crear(request));}
 @Test void personaInexistente(){when(ofertas.existsById(oferta)).thenReturn(true);assertThrows(ResponseStatusException.class,()->service.crear(request));}
 @Test void actualiza(){relaciones();when(repo.obtener(id)).thenReturn(Optional.of(original));when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertEquals(id,service.actualizar(id,request).id());}
 @Test void elimina(){when(repo.obtener(id)).thenReturn(Optional.of(original));service.eliminar(id);verify(repo).eliminar(id);}
 @Test void noEliminaInexistente(){assertThrows(ResponseStatusException.class,()->service.eliminar(id));}
}
