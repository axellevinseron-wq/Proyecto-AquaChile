package cl.aquachile.backend.oferta.service;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.dto.OfertaRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class OfertaServiceTest {
 private OfertaRepository repo;
 private OfertaService service;
 private OfertaRequest request(boolean publicada){return new OfertaRequest("Analista","Descripcion","Puerto Montt",publicada,"OPERACIONES","PRESENCIAL",null,2,"Funciones","Requisitos","Beneficios","1000000-1500000");}
 @BeforeEach void setup(){repo=mock(OfertaRepository.class);service=new OfertaService(repo);}
 @Test void crearOfertaCompleta(){when(repo.guardar(any())).thenAnswer(a->a.getArgument(0));var o=service.crear(request(true));assertEquals("OPERACIONES",o.categoria());assertEquals(2,o.cupos());assertNotNull(o.fechaPublicacion());verify(repo).guardar(any());}
 @Test void listar(){when(repo.listar()).thenReturn(List.of());assertTrue(service.listar().isEmpty());}
 @Test void obtenerInexistente(){when(repo.obtener(any())).thenReturn(Optional.empty());assertThrows(ResponseStatusException.class,()->service.obtener(UUID.randomUUID()));}
 @Test void actualizarConservaFecha(){var id=UUID.randomUUID();var actual=new Oferta(id,"Anterior","D","L",true,"C","REMOTA",java.time.LocalDate.of(2025,1,1),1,null,null,null,null);when(repo.obtener(id)).thenReturn(Optional.of(actual));when(repo.guardar(any())).thenAnswer(a->a.getArgument(0));assertEquals(actual.fechaPublicacion(),service.actualizar(id,request(true)).fechaPublicacion());}
 @Test void eliminar(){var id=UUID.randomUUID();when(repo.obtener(id)).thenReturn(Optional.of(new Oferta(id,"T",null,null,false)));service.eliminar(id);verify(repo).eliminar(id);}
}
