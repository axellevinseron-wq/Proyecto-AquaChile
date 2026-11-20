package cl.aquachile.backend.postulante.controller;
import cl.aquachile.backend.postulante.service.PostulanteService;
import cl.aquachile.backend.postulante.dto.PostulanteRequest;
import cl.aquachile.backend.postulante.entity.Postulante;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
class PostulanteControllerTest {
 @Test void operacionesCrudDeleganEnServicio() {
  PostulanteService service=mock(PostulanteService.class);
  PostulanteController c=new PostulanteController(service);
  UUID id=UUID.randomUUID();
  Postulante item=mock(Postulante.class);
  PostulanteRequest request=mock(PostulanteRequest.class);
  when(service.listar()).thenReturn(List.of(item));
  when(service.obtener(id)).thenReturn(item);
  when(service.crear(request)).thenReturn(item);
  when(service.actualizar(id,request)).thenReturn(item);
  assertEquals(1,c.listar().size());
  assertSame(item,c.obtener(id));
  assertEquals(201,c.crear(request).getStatusCode().value());
  assertSame(item,c.actualizar(id,request));
  c.eliminar(id);
  verify(service).eliminar(id);
 }
}
