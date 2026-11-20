package cl.aquachile.backend.postulante.service;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulante.entity.Postulante;
import cl.aquachile.backend.postulante.dto.PostulanteRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class PostulanteServiceTest {
 final PostulanteRepository repo=mock(PostulanteRepository.class);
 final PostulanteService service=new PostulanteService(repo);
 final UUID id=UUID.randomUUID();
 final Postulante original=new Postulante(id,"Ana","ana@correo.cl","123","12345678-5");
 final PostulanteRequest request=new PostulanteRequest("Ana","ana@correo.cl","123","12345678-5");
 @Test void lista(){when(repo.listar()).thenReturn(List.of(original));assertEquals(1,service.listar().size());}
 @Test void obtiene(){when(repo.obtener(id)).thenReturn(Optional.of(original));assertEquals(id,service.obtener(id).id());}
 @Test void noExiste(){assertThrows(ResponseStatusException.class,()->service.obtener(id));}
 @Test void crea(){when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertEquals("Ana",service.crear(request).nombre());}
 @Test void actualiza(){when(repo.obtener(id)).thenReturn(Optional.of(original));when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertEquals(id,service.actualizar(id,request).id());}
 @Test void elimina(){when(repo.obtener(id)).thenReturn(Optional.of(original));service.eliminar(id);verify(repo).eliminar(id);}
 @Test void noEliminaInexistente(){assertThrows(ResponseStatusException.class,()->service.eliminar(id));verify(repo,never()).eliminar(any());}
}
